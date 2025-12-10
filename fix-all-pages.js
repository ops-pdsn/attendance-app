const fs = require('fs');
const path = require('path');

console.log('Fixing page files...\n');

function fixPageFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        
        // Remove server directives from client components
        if (content.includes("'use client'") || content.includes('"use client"')) {
            // Remove export const dynamic and fetchCache lines
            let newContent = content
                .replace(/export\s+const\s+dynamic\s*=\s*['"][^'"]+['"];?\n?/g, '')
                .replace(/export\s+const\s+fetchCache\s*=\s*['"][^'"]+['"];?\n?/g, '')
                .replace(/export\s+const\s+revalidate\s*=\s*\d+;?\n?/g, '');
            
            // Ensure 'use client' is at the very top
            if (!newContent.trim().startsWith("'use client'") && !newContent.trim().startsWith('"use client"')) {
                // Find the 'use client' line and move it to top
                const useClientMatch = newContent.match(/(['"]use client['"])\n?/);
                if (useClientMatch) {
                    newContent = newContent.replace(useClientMatch[0], '').trim();
                    newContent = `${useClientMatch[0].trim()}\n\n${newContent}`;
                }
            }
            
            // Remove any empty lines at the start
            newContent = newContent.replace(/^\s*\n+/, '');
            
            if (newContent !== content) {
                fs.writeFileSync(filePath, newContent);
                console.log(`✅ Fixed: ${relativePath}`);
                return true;
            }
        }
        
        // For non-client components (server components), ensure they have dynamic export if needed
        else {
            // Check if it's a page file that does data fetching
            const isPage = filePath.includes('page.js') || filePath.includes('page.ts') || 
                          filePath.includes('page.jsx') || filePath.includes('page.tsx');
            
            if (isPage) {
                const hasDataFetching = content.includes('fetch(') || 
                                       content.includes('prisma.') || 
                                       (content.includes('await ') && !content.includes('useEffect'));
                
                const hasDynamicExport = content.includes('export const dynamic');
                
                if (hasDataFetching && !hasDynamicExport) {
                    const newContent = `export const dynamic = 'force-dynamic';\nexport const fetchCache = 'force-no-store';\n\n${content}`;
                    fs.writeFileSync(filePath, newContent);
                    console.log(`✅ Added dynamic export to: ${relativePath}`);
                    return true;
                }
            }
        }
    } catch (e) {
        console.log(`❌ Error fixing ${filePath}: ${e.message}`);
    }
    return false;
}

// Fix all page files
function fixAllPages(dir) {
    let fixedCount = 0;
    
    function walk(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
            if (item === 'api' || item === 'node_modules') return;
            
            const fullPath = path.join(currentDir, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                walk(fullPath);
            } else if (item.match(/page\.(js|jsx|ts|tsx)$/)) {
                if (fixPageFile(fullPath)) {
                    fixedCount++;
                }
            }
        });
    }
    
    const appDir = path.join(__dirname, 'src', 'app');
    if (fs.existsSync(appDir)) {
        walk(appDir);
    }
    
    return fixedCount;
}

const fixed = fixAllPages();
console.log(`\n✅ Fixed ${fixed} page files`);

// Also check layout.js
const layoutPath = path.join(__dirname, 'src', 'app', 'layout.js');
if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    // Layout should have dynamic export but NOT 'use client'
    if (!layoutContent.includes('export const dynamic') && !layoutContent.includes('"use client"')) {
        const newLayoutContent = 'export const dynamic = \'force-dynamic\';\nexport const fetchCache = \'force-no-store\';\n\n' + layoutContent;
        fs.writeFileSync(layoutPath, newLayoutContent);
        console.log('✅ Fixed layout.js with dynamic exports');
    }
}

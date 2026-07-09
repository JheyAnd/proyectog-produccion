import re
with open('c:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/frontend/src/components/ui/Modal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('import React, { useEffect } from 'react';', 'import React, { useEffect } from 'react';\nimport { createPortal } from 'react-dom';')
content = content.replace('  return (\n    <div className="fixed', '  return createPortal(\n    <div className="fixed')
content = content.replace('    </div>\n  );\n}', '    </div>,\n    document.body\n  );\n}')
with open('c:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/frontend/src/components/ui/Modal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Added portal to Modal')

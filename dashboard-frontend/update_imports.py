import re
with open('c:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/frontend/src/components/projects/ProjectsTrackingTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('import { exportProjectsToExcel } from', 'import Modal from '@/components/ui/Modal';\nimport { useQuery } from '@tanstack/react-query';\nimport apiClient from '@/services/api/client';\nimport { exportProjectsToExcel } from')
with open('c:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/frontend/src/components/projects/ProjectsTrackingTable.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated imports')

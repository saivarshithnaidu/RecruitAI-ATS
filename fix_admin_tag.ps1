$p = 'c:\RecruitAI\ai-ats\app\admin\candidates\[id]\page.tsx'
$lines = [System.IO.File]::ReadAllLines($p)
$lines[403] = '                                    }` } >' # Extra space doesn't hurt JSX
[System.IO.File]::WriteAllLines($p, $lines)

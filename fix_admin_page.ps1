$p = 'c:\RecruitAI\ai-ats\app\admin\candidates\[id]\page.tsx'
$lines = [System.IO.File]::ReadAllLines($p)
$lines[403] = '                                    }`}> ' # Line 404
$newLines = $lines[0..474] + $lines[476..($lines.Count-1)] # Remove line 476
[System.IO.File]::WriteAllLines($p, $newLines)

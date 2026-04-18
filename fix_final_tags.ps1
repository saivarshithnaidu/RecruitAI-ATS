$p = 'c:\RecruitAI\ai-ats\app\admin\candidates\[id]\page.tsx'
$lines = [System.IO.File]::ReadAllLines($p)
$newLines = $lines[0..474] + '        </div>' + $lines[475..($lines.Count-1)] # Add it back
[System.IO.File]::WriteAllLines($p, $newLines)

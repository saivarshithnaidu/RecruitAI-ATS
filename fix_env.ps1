
$content = Get-Content .env
$newContent = $content | ForEach-Object {
    if ($_ -match "^DATABASE_URL=psql '(.*)'$") {
        "DATABASE_URL=" + $Matches[1]
    } else {
        $_
    }
}
$newContent | Set-Content .env

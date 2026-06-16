$backendPath = Join-Path $PSScriptRoot 'backend'
$frontendPath = $PSScriptRoot

Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$backendPath'; npm start"
Set-Location $frontendPath
npm run dev -- --host 127.0.0.1

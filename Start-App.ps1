$Root = "G:\My Drive\SAGE_50_INTEGRATE_PROJECT"
Set-Location -LiteralPath $Root
$Port = 8789
Start-Process "http://127.0.0.1:$Port/app/index.html"
try {
  py -3 -m http.server $Port
} catch {
  python -m http.server $Port
}

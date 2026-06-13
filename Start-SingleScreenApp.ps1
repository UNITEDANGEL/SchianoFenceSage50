$Root = "G:\My Drive\SAGE_50_INTEGRATE_PROJECT"
Set-Location $Root
$Port = 8790
Start-Process "http://127.0.0.1:$Port/app_single_screen/index.html"
python -m http.server $Port
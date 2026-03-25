$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:8080/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Serving $root at $prefix"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $requestPath = $requestPath -replace "/", "\"
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $requestPath))

    if (-not $fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not (Test-Path $fullPath -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $context.Response.Close()
      continue
    }

    switch ([System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()) {
      ".html" { $context.Response.ContentType = "text/html; charset=utf-8" }
      ".css" { $context.Response.ContentType = "text/css; charset=utf-8" }
      ".js" { $context.Response.ContentType = "application/javascript; charset=utf-8" }
      ".json" { $context.Response.ContentType = "application/json; charset=utf-8" }
      ".png" { $context.Response.ContentType = "image/png" }
      ".jpg" { $context.Response.ContentType = "image/jpeg" }
      ".jpeg" { $context.Response.ContentType = "image/jpeg" }
      ".svg" { $context.Response.ContentType = "image/svg+xml" }
      default { $context.Response.ContentType = "application/octet-stream" }
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.OutputStream.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}

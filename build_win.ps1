# 以管理员权限打开PS，执行：`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

Get-ChildItem -Path _build -Exclude .git | Remove-Item -Recurse -Force
sphinx-build -b html . _build
$packageName = 'screen-inu'
$version = '0.2.3'
$url64 = "https://github.com/ImL1s/screen_inu/releases/download/v$version/Screen.Inu_$version_x64-setup.exe"
$checksum64 = 'REPLACE_WITH_SHA256'

$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

Install-ChocolateyPackage `
  -PackageName "$packageName" `
  -FileType 'exe' `
  -SilentArgs "/S" `
  -Url64bit "$url64" `
  -Checksum64 "$checksum64" `
  -ChecksumType64 'sha256' `
  -ValidExitCodes @(0)

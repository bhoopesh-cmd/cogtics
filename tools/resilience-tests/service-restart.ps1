param(
  [Parameter(Mandatory = $true)]
  [string]$ContainerName
)

Write-Host "Restarting container: $ContainerName"

docker restart $ContainerName

Write-Host "Restart complete."

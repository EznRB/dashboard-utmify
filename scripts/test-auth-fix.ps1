# Script para testar sistema de autenticacao
Write-Host "Testando Sistema de Autenticacao" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

$baseUrl = "http://localhost:3001/api/v1"

# Funcao para fazer requisicoes HTTP
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    }
    catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Unknown" }
        return @{ 
            Success = $false; 
            StatusCode = $statusCode; 
            Error = $_.Exception.Message
        }
    }
}

# Teste 1: Health Check
Write-Host "\n1. Testando conectividade da API..." -ForegroundColor Cyan
$healthCheck = Invoke-ApiRequest -Url "http://localhost:3001/health"

if ($healthCheck.Success) {
    Write-Host "OK - API esta respondendo" -ForegroundColor Green
} else {
    Write-Host "ERRO - API nao esta respondendo: $($healthCheck.Error)" -ForegroundColor Red
    exit 1
}

# Teste 2: Registro de usuario
Write-Host "\n2. Testando registro de usuario..." -ForegroundColor Cyan

$registerData = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
    organizationName = "Test Organization"
} | ConvertTo-Json

$registerResult = Invoke-ApiRequest -Url "$baseUrl/auth/register" -Method "POST" -Body $registerData

if ($registerResult.Success) {
    Write-Host "OK - Registro realizado com sucesso" -ForegroundColor Green
    $accessToken = $registerResult.Data.data.tokens.accessToken
    Write-Host "Token obtido com sucesso" -ForegroundColor Gray
} else {
    Write-Host "AVISO - Registro falhou (usuario pode ja existir): $($registerResult.StatusCode)" -ForegroundColor Yellow
    
    # Teste 3: Login
    Write-Host "\n3. Testando login..." -ForegroundColor Cyan
    
    $loginData = @{
        email = "test@example.com"
        password = "password123"
    } | ConvertTo-Json
    
    $loginResult = Invoke-ApiRequest -Url "$baseUrl/auth/login" -Method "POST" -Body $loginData
    
    if ($loginResult.Success) {
        Write-Host "OK - Login realizado com sucesso" -ForegroundColor Green
        $accessToken = $loginResult.Data.data.tokens.accessToken
        Write-Host "Token obtido com sucesso" -ForegroundColor Gray
    } else {
        Write-Host "ERRO - Login falhou: $($loginResult.StatusCode) - $($loginResult.Error)" -ForegroundColor Red
        exit 1
    }
}

# Teste 4: Endpoint protegido
Write-Host "\n4. Testando endpoint protegido..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $accessToken"
}

$profileResult = Invoke-ApiRequest -Url "$baseUrl/auth/me" -Headers $headers

if ($profileResult.Success) {
    Write-Host "OK - Endpoint protegido funcionando" -ForegroundColor Green
} else {
    Write-Host "ERRO - Endpoint protegido falhou: $($profileResult.StatusCode) - $($profileResult.Error)" -ForegroundColor Red
}

# Teste 5: UTM link
Write-Host "\n5. Testando criacao de UTM link..." -ForegroundColor Cyan

$utmData = @{
    originalUrl = "https://example.com"
    utmSource = "test"
    utmMedium = "email"
    utmCampaign = "test-campaign"
    title = "Test UTM Link"
} | ConvertTo-Json

$utmResult = Invoke-ApiRequest -Url "$baseUrl/utm/create" -Method "POST" -Headers $headers -Body $utmData

if ($utmResult.Success) {
    Write-Host "OK - UTM link criado com sucesso" -ForegroundColor Green
} else {
    Write-Host "ERRO - Criacao de UTM link falhou: $($utmResult.StatusCode) - $($utmResult.Error)" -ForegroundColor Red
}

# Resumo
Write-Host "\nRESUMO DOS TESTES" -ForegroundColor Yellow
Write-Host "================" -ForegroundColor Yellow
Write-Host "API Health: OK" -ForegroundColor Green

if ($registerResult.Success -or $loginResult.Success) {
    Write-Host "Autenticacao: OK" -ForegroundColor Green
} else {
    Write-Host "Autenticacao: FALHOU" -ForegroundColor Red
}

if ($profileResult.Success) {
    Write-Host "Endpoints Protegidos: OK" -ForegroundColor Green
} else {
    Write-Host "Endpoints Protegidos: FALHOU" -ForegroundColor Red
}

if ($utmResult.Success) {
    Write-Host "Funcionalidades UTM: OK" -ForegroundColor Green
} else {
    Write-Host "Funcionalidades UTM: FALHOU" -ForegroundColor Red
}

Write-Host "\nTeste concluido!" -ForegroundColor Yellow
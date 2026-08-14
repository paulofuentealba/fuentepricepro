# 0. VERIFICAÇÃO DE PRIVILÉGIOS DE ADMINISTRADOR
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "O script requer privilégios de Administrador. Solicitando elevação..."
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Exit
}

# 1. Definição dos Caminhos
$diretorioOrigem = "C:\Users\paulo\OneDrive\GitHub"
$diretorioDestino = "C:\Users\paulo\OneDrive\Fuente Price Pro\.claude\Plugins"
$arquivoLog = Join-Path -Path $diretorioDestino -ChildPath "LogAtualizacao.txt"

# Inicia o arquivo de log limpo
"==================================================" | Out-File -FilePath $arquivoLog -Encoding utf8
" LOG DE ATUALIZAÇÃO DOS PLUGINS - $(Get-Date)" | Out-File -FilePath $arquivoLog -Append -Encoding utf8
"==================================================`n" | Out-File -FilePath $arquivoLog -Append -Encoding utf8

$pastas = Get-ChildItem -Path $diretorioOrigem -Directory | Where-Object { $_.Name -ne "fuentepricepro" }

Clear-Host
Write-Host "Iniciando atualização silenciosa dos plugins..." -ForegroundColor Cyan
"Derrubando processos node em segundo plano..." | Out-File -FilePath $arquivoLog -Append -Encoding utf8
taskkill /F /IM node.exe 2>&1 | Out-File -FilePath $arquivoLog -Append -Encoding utf8

$relatorio = @()

foreach ($pasta in $pastas) {
    $nomePasta = $pasta.Name
    $caminhoOrigem = $pasta.FullName
    $caminhoDestino = Join-Path -Path $diretorioDestino -ChildPath $nomePasta
    $caminhoNodeModules = Join-Path -Path $caminhoDestino -ChildPath "node_modules"

    $acaoFeita = "Nenhuma"
    $precisaSincronizar = $false

    Write-Host "Processando: $nomePasta..." -NoNewline -ForegroundColor Yellow
    "`n----------------------------------------" | Out-File -FilePath $arquivoLog -Append -Encoding utf8
    "-> Processando Plugin: $nomePasta" | Out-File -FilePath $arquivoLog -Append -Encoding utf8

    # Regra 1: Sincronização e Git
    if (-not (Test-Path $caminhoDestino)) {
        $precisaSincronizar = $true
        $acaoFeita = "Instalação Nova"
    } elseif (Test-Path (Join-Path $caminhoOrigem ".git")) {
        Set-Location -Path $caminhoOrigem
        git fetch origin 2>&1 | Out-File -FilePath $arquivoLog -Append -Encoding utf8
        $status = git status -uno 2>&1
        
        if ($status -match "Your branch is behind" -or $status -match "have diverged") {
            git pull 2>&1 | Out-File -FilePath $arquivoLog -Append -Encoding utf8
            $precisaSincronizar = $true
            $acaoFeita = "Atualizado do Git"
        }
    } else {
        $precisaSincronizar = $true
    }

    # 2. Executa a cópia via Robocopy
    if ($precisaSincronizar) {
        "Sincronizando arquivos com Robocopy..." | Out-File -FilePath $arquivoLog -Append -Encoding utf8
        $argumentos = @("$caminhoOrigem", "$caminhoDestino", "/MIR", "/XD", ".git", "node_modules", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np")
        & robocopy $argumentos | Out-File -FilePath $arquivoLog -Append -Encoding utf8
    }

    # 3. Regra de Instalação (NPM): Instala se sincronizou código novo OU se faltar a pasta node_modules
    if (Test-Path (Join-Path $caminhoDestino "package.json")) {
        if ($precisaSincronizar -or -not (Test-Path $caminhoNodeModules)) {
            Set-Location -Path $caminhoDestino
            "Instalando pacotes via NPM..." | Out-File -FilePath $arquivoLog -Append -Encoding utf8
            
            if ($nomePasta -match "OmniRoute") {
                npm approve-scripts better-sqlite3 @playwright/browser-chromium bun core-js koffi libxmljs2 onnxruntime-node opencode-ai tls-client-node 2>&1 | Out-File -FilePath $arquivoLog -Append -Encoding utf8
            }
            
            npm install --no-audit --no-fund 2>&1 | Out-File -FilePath $arquivoLog -Append -Encoding utf8
            
            if ($nomePasta -match "OmniRoute") {
                npm install better-sqlite3 2>&1 | Out-File -FilePath $arquivoLog -Append -Encoding utf8
            }
            
            if ($acaoFeita -eq "Nenhuma") { $acaoFeita = "Dependências Reparadas" }
        }
    }

    # 4. Inicialização Automática
    $iniciado = "Não (É só biblioteca)"
    if (Test-Path (Join-Path $caminhoDestino "package.json")) {
        $packageJsonPath = Join-Path $caminhoDestino "package.json"
        $pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        if ($null -ne $pkg.scripts -and $null -ne $pkg.scripts.start) {
            Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$caminhoDestino'; npm start`""
            $iniciado = "Sim (Em nova janela)"
            "Ação: Servidor iniciado em janela externa via npm start." | Out-File -FilePath $arquivoLog -Append -Encoding utf8
        }
    }

    Write-Host " [ OK ]" -ForegroundColor Green

    $relatorio += [PSCustomObject]@{
        "Nome do Plugin" = $nomePasta
        "Status" = $acaoFeita
        "Servidor" = $iniciado
    }
}

$tabelaFinal = $relatorio | Format-Table -AutoSize | Out-String
Write-Host "`n================== RESUMO DA ATUALIZAÇÃO ==================" -ForegroundColor Cyan
Write-Host $tabelaFinal
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "Log detalhado salvo em: $arquivoLog" -ForegroundColor Green
"`n================== RESUMO DA ATUALIZAÇÃO ==================" | Out-File -FilePath $arquivoLog -Append -Encoding utf8
$tabelaFinal | Out-File -FilePath $arquivoLog -Append -Encoding utf8
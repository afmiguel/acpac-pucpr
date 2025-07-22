# Aatico - Agregador de Atividades Complementares

Sistema WebAssembly para agregação e validação de certificados de atividades complementares acadêmicas.

## 📋 Visão Geral

**Aatico** é um sistema web completo desenvolvido em Rust + WebAssembly que permite:

- ✅ Upload via drag & drop ou clique de certificados PDF (máximo 5MB)
- ✅ Categorização dinâmica baseada em Manual de Atividades Complementares
- ✅ Formulários específicos por subcategoria de atividade
- ✅ Validação de arquivos únicos e gestão de metadados
- ✅ Geração de POTX com PDFs + JSONs estruturados
- ✅ Interface web responsiva com navegação intuitiva

## 🏗️ Arquitetura

### Tecnologias
- **Backend**: Rust + WebAssembly (WASM)
- **Frontend**: JavaScript ES6+ + HTML5 + CSS3
- **Configuração**: JSON dinâmico
- **Output**: POTX com metadados estruturados

### Estrutura de Arquivos
```
aatico/
├── src/
│   ├── lib.rs           # Core WebAssembly (Rust)
│   └── utils.rs         # Utilitários
├── index.html           # Interface principal
├── bootstrap.js         # Lógica JavaScript
├── acs.json            # Configuração de categorias
├── Cargo.toml          # Dependências Rust
└── pkg/                # Arquivos WASM compilados
```

## 🚀 Como Usar

### Pré-requisitos
- Rust (latest stable)
- wasm-pack
- Servidor HTTP local (recomendado)

### 1. Compilação
```bash
# Compilar para WebAssembly
wasm-pack build --target web
```

### 2. Execução

#### Opção A: Com Servidor HTTP (Recomendado)
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
npx http-server .

# PHP
php -S localhost:8000
```
Acesse: `http://localhost:8000`

#### Opção B: Acesso Direto
- Abra `index.html` diretamente no navegador
- Funciona com dados de fallback (limitados)

## 📝 Fluxo de Uso

1. **Upload**: Arraste certificado PDF para a área de drop ou clique para selecionar (max 5MB)
2. **Validação**: Sistema verifica formato e duplicatas
3. **Categoria**: Escolha categoria principal (AC, PR, PQ, CE, IDC)
4. **Subcategoria**: Selecione atividade específica
5. **Formulário**: Preencha campos obrigatórios gerados dinamicamente
6. **Lista**: Arquivo aparece em card detalhado com todas as informações e opção de exclusão
7. **POTX**: Gere arquivo final com PDFs + metadados JSON

## 🗂️ Sistema de Categorias

### Categorias Principais
- **AC** - Acadêmica (9 subcategorias: AC01-AC09)
- **PR** - Profissionalizante (4 subcategorias: PR01-PR04)
- **PQ** - Pesquisa (7 subcategorias: PQ01-PQ07)
- **CE** - Cultura e Esporte (6 subcategorias: CE01-CE06)
- **IDC** - Identidade e Cidadania (4 subcategorias: IDC01-IDC04)

### Formulários Dinâmicos
O sistema gera automaticamente formulários baseados em:
- **Data**: Campos dia/mês/ano
- **Duração**: Campos horas/minutos
- **Texto**: Inputs livres
- **Seleção**: Dropdowns para opções específicas

### Exibição Inteligente
O sistema formata automaticamente os dados para exibição:
- **Labels corrigidos**: Tabela de conversão que transforma campos malformados em labels legíveis
- **Datas agrupadas**: "15/10/2024"
- **Durações combinadas**: "8h 30min"
- **Campos organizados**: Em cards visuais de 3 linhas

## 📦 Arquivos de Saída

### Estrutura do POTX
```
atividades_complementares.potx
├── certificado1.pdf
├── certificado1.json
├── certificado2.pdf
├── certificado2.json
└── ...
```

> **Nota sobre .potx**: O arquivo gerado mantém o formato ZIP padrão, mas usa a extensão `.potx`. Para extrair o conteúdo, basta renomear a extensão para `.zip` ou usar qualquer programa de descompactação.

### Exemplo de JSON Gerado
```json
{
  "nomeArquivo": "certificado.pdf",
  "categoria": "AC",
  "timestamp": "2024-01-15T10:30:00Z",
  "codigoSubcategoria": "AC01",
  "nomeAtividade": "Participação de Evento Acadêmico",
  "pontos": "0,25 a cada hora",
  "maxPontosAtividade": 15,
  "nomedoeventoacademico": "Semana de Ciência e Tecnologia",
  "cargahorariatotaldoeventoHoras": 8,
  "cargahorariatotaldoeventoMinutos": 0,
  "datadeiniciodoeventoDia": 15,
  "datadeiniciodoeventoMes": 10,
  "datadeiniciodoeventoAno": 2024
}
```

## 🔧 Configuração

### acs.json
Arquivo de configuração que define:
- Categorias e subcategorias disponíveis
- Campos obrigatórios por subcategoria
- Sistemas de pontuação
- Informações necessárias para cada tipo de atividade

### Fallback
Sistema robusto que funciona mesmo sem `acs.json`, usando dados básicos embutidos.

## 🛠️ Desenvolvimento

### Dependências Principais
```toml
[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde_json = "1.0"
chrono = { version = "0.4", features = ["serde", "wasm-bindgen"] }
zip = { version = "2.1", default-features = false, features = ["deflate"] }
web-sys = { version = "0.3", features = ['console'] }
```

### Funções WASM Exportadas
- `validate_file()` - Validação de PDF e duplicatas
- `add_file_temporarily()` - Armazenamento temporário
- `add_file_metadata()` - Gestão de metadados
- `remove_processed_file()` - Exclusão de arquivos
- `zip_and_clear_files()` - Geração final do POTX

### Testes

O projeto possui uma suíte completa de **84+ testes automatizados** cobrindo todas as camadas:

#### Executar todos os testes (recomendado)
```bash
npm run test:all:working
```

#### Testes individuais
```bash
npm run test:rust          # 17 testes Rust (unitários)
npm test                   # 57 testes JavaScript (integração)
npm run test:e2e:basic     # 10 testes E2E (interface)
npm run test:performance   # Testes de performance
```

#### Configuração inicial
```bash
npm install                # Instalar dependências
npx playwright install     # Instalar navegadores
npm run build             # Buildar WASM (se necessário)
```

**Documentação completa**: [TESTING_GUIDE.md](TESTING_GUIDE.md)

## 🔒 Validações e Segurança

- **Extensão**: Apenas arquivos `.pdf`
- **Tamanho**: Máximo 5MB por arquivo
- **Duplicatas**: Prevenção por nome de arquivo com alerta
- **Múltiplos arquivos**: Bloqueio de drag & drop múltiplo com orientação
- **Campos**: Validação obrigatória de formulários
- **Sanitização**: Limpeza de entradas maliciosas

## 🎯 Funcionalidades Avançadas

- **Interface Drag & Drop**: Zona visual para arrastar arquivos ou clicar (apenas um por vez)
- **Lista Detalhada**: Cards com informações completas de cada arquivo (nome, categoria, atividade, dados específicos)
- **Navegação Inteligente**: Modals com comportamento específico
- **Alertas Visuais**: Todas as mensagens de erro via popup do navegador
- **Confirmações**: Dialogs para ações destrutivas
- **Estado Persistente**: Gerenciamento robusto de referências
- **Performance**: Processamento em memória sem I/O de disco

## 📚 Documentação

- `especificacao.md` - Especificação técnica completa
- `transfer-context.md` - Contexto de transferência do projeto

## 🐛 Troubleshooting

### Problemas Comuns
- **Servidor HTTP**: Necessário para carregar `acs.json` completo
- **CORS**: Use servidor HTTP local, não file://
- **Browser**: Requer suporte moderno a WebAssembly

### Debug
- Console mostra origem dos dados (fetch vs fallback)
- Logs Rust aparecem prefixados com "Rust: "
- Validações são logadas automaticamente

## 📄 Licença

Licenciado sob:
- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE_APACHE))
- MIT license ([LICENSE-MIT](LICENSE_MIT))

---

**Desenvolvido com 🦀 Rust + 🕸️ WebAssembly**
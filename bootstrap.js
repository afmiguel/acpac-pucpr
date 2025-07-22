// Aatico - Agregador de Atividades Complementares
// Importa o inicializador do WASM e as funções que exportamos do Rust.
import init, { validate_file, add_file_temporarily, remove_temporary_file, remove_processed_file, add_file_metadata, zip_and_clear_files, get_files_with_metadata, get_version, get_build_time } from './pkg/aatico.js';

// Carrega os dados de acs.json
let acsData = null;

async function loadAcsData() {
    try {
        const response = await fetch('./acs.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        acsData = await response.json();
        console.log('Aatico: Configurações de atividades complementares carregadas com sucesso');
        return acsData;
    } catch (error) {
        console.error('Erro ao carregar acs.json via fetch:', error);
        
        // Fallback: dados embutidos no código para desenvolvimento/teste
        console.log('Usando dados de fallback embutidos...');
        acsData = {
            "manual_atividades_complementares": {
                "curso": "Engenharia de Computação",
                "categorias": [
                    {
                        "categoria_nome": "Acadêmica",
                        "sigla": "AC",
                        "atividades": [
                            {
                                "codigo": "AC01",
                                "atividade": "Participação de Evento Acadêmico, como Semana Acadêmica, Exposições, Seminários, visitas técnicas e demais atividades extracurriculares.",
                                "pontos": "0,25 a cada hora",
                                "max_pontos_atividade": 15,
                                "informacoes_necessarias": [
                                    "Certificado de participação (PDF)",
                                    "Nome do evento acadêmico",
                                    "Carga horária total do evento",
                                    "Data de início do evento"
                                ]
                            }
                        ]
                    },
                    {
                        "categoria_nome": "Profissionalizante",
                        "sigla": "PR",
                        "atividades": [
                            {
                                "codigo": "PR01",
                                "atividade": "Estágio Supervisionado não obrigatório",
                                "pontos": "5 a cada trimestre",
                                "max_pontos_atividade": 25,
                                "informacoes_necessarias": [
                                    "Contrato de estágio (PDF)",
                                    "Nome da empresa",
                                    "Data de início do estágio",
                                    "Data de fim do estágio"
                                ]
                            }
                        ]
                    },
                    {
                        "categoria_nome": "Pesquisa",
                        "sigla": "PQ",
                        "atividades": [
                            {
                                "codigo": "PQ01",
                                "atividade": "Participação em Programa de Iniciação Científica",
                                "pontos": "10 por projeto",
                                "max_pontos_atividade": 20,
                                "informacoes_necessarias": [
                                    "Comprovante de aprovação (PDF)",
                                    "Nome do projeto de pesquisa"
                                ]
                            }
                        ]
                    },
                    {
                        "categoria_nome": "Cultura e Esporte",
                        "sigla": "CE",
                        "atividades": [
                            {
                                "codigo": "CE01",
                                "atividade": "Participação em cursos de idiomas",
                                "pontos": "10",
                                "max_pontos_atividade": 10,
                                "informacoes_necessarias": [
                                    "Certificado oficial (PDF)",
                                    "Nome do curso de idioma",
                                    "Nome da instituição de ensino"
                                ]
                            }
                        ]
                    },
                    {
                        "categoria_nome": "Identidade e Cidadania",
                        "sigla": "IDC",
                        "atividades": [
                            {
                                "codigo": "IDC01",
                                "atividade": "Participação em Projetos da Diretoria de Identidade",
                                "pontos": "0,25 por hora",
                                "max_pontos_atividade": 10,
                                "informacoes_necessarias": [
                                    "Certificado da Diretoria (PDF)",
                                    "Nome do projeto/programa",
                                    "Duração da participação (horas e minutos)"
                                ]
                            }
                        ]
                    }
                ]
            }
        };
        
        console.log('Aatico: Configurações básicas de fallback carregadas');
        return acsData;
    }
}

async function run() {
    // 1. Carrega dados do ACS
    await loadAcsData();
    if (!acsData) {
        alert('Erro crítico: Não foi possível carregar as configurações de atividades complementares.\n\nVerifique se você está executando via servidor HTTP ou recarregue a página.');
        return;
    }

    // 2. Inicializa o módulo WebAssembly
    await init();
    console.log('Aatico: Sistema WebAssembly inicializado com sucesso');
    
    // 2.1. Atualiza data/hora de build real
    try {
        const buildTime = get_build_time();
        const version = get_version();
        const buildTimeElement = document.getElementById('build-time');
        if (buildTimeElement) {
            buildTimeElement.textContent = `Build: v${version} - ${buildTime}`;
        }
    } catch (error) {
        console.warn('Erro ao obter data de build:', error);
        const buildTimeElement = document.getElementById('build-time');
        if (buildTimeElement) {
            try {
                const version = get_version();
                buildTimeElement.textContent = `Build: v${version}`;
            } catch (versionError) {
                console.error('Erro ao obter versão:', versionError);
                buildTimeElement.textContent = 'Build: Erro ao carregar';
            }
        }
    }

    // 3. Pega os elementos do DOM
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const zipButton = document.getElementById('zip-button');
    const fileList = document.getElementById('file-list');
    
    // Modais
    const categoryModal = document.getElementById('category-modal');
    const subcategoryModal = document.getElementById('subcategory-modal');
    const detailsModal = document.getElementById('details-modal');
    const detailsTitle = document.getElementById('details-title');
    const detailsDescription = document.getElementById('details-description');
    const dynamicFormContainer = document.getElementById('dynamic-form-container');
    
    // Elementos de subcategoria
    const subcategoryTitle = document.getElementById('subcategory-title');
    const subcategoryButtonsContainer = document.getElementById('subcategory-buttons-container');

    let fileCount = 0;
    let currentFile = null;
    let currentFileData = null;
    let selectedCategory = null;
    let selectedSubcategory = null;
    let currentSubcategoryData = null;
    
    // Limite máximo de arquivos
    const MAX_FILES = 10;
    
    // Estado inicial
    
    // Tabela integrada única: Nome interno → Campo PDF + Label de exibição + Tipo
    const COMPLETE_FIELD_MAPPING = {
        // Campos base
        'codigoSubcategoria': { pdfField: 'ac_subcategoria', displayLabel: 'Subcategoria', type: 'text' },
        'timestamp': { pdfField: 'ac_timestamp', displayLabel: 'Timestamp', type: 'text' },
        
        // AC01 - Participação de Evento Acadêmico
        'Nome do evento acadêmico': { pdfField: 'ac_nome', displayLabel: 'Evento', type: 'text' },
        'Carga horária total do evento': { pdfField: ['ac_horas', 'ac_minutos'], displayLabel: 'C.H.', type: 'duration' },
        'Data de início do evento': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Início', type: 'date' },
        
        // AC02 - Participação no Planeta PUCPR
        'Carga horária da participação': { pdfField: ['ac_horas', 'ac_minutos'], displayLabel: 'C.H.', type: 'duration' },
        'Data de início da participação': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Início', type: 'date' },
        
        // AC03 - Curso de Extensão na PUCPR
        'Nome do curso de extensão': { pdfField: 'ac_curso', displayLabel: 'Curso', type: 'text' },
        'Carga horária total do curso': { pdfField: ['ac_horas', 'ac_minutos'], displayLabel: 'C.H.', type: 'duration' },
        'Data de início do curso': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Início', type: 'date' },
        
        // AC04 - Curso de Extensão externo à PUCPR (reutiliza campos do AC03 + instituição)
        'Nome da instituição ofertante': { pdfField: 'ac_instituicao', displayLabel: 'Instituição', type: 'text' },
        
        // AC05 - Disciplinas de outros Cursos
        'Nome da disciplina cursada': { pdfField: 'ac_disciplina', displayLabel: 'Disciplina', type: 'text' },
        'Nome do curso de origem da disciplina': { pdfField: 'ac_curso', displayLabel: 'Curso', type: 'text' },
        'Carga horária da disciplina (horas/aula)': { pdfField: 'ac_carga_horaria', displayLabel: 'C.H.', type: 'text' },
        'Informações adicionais': { pdfField: 'ac_informacoes_adicionais', displayLabel: 'Informações', type: 'text' },
        
        // AC06 - Atividades de Monitoria
        'Nome da disciplina da monitoria': { pdfField: 'ac_nome', displayLabel: 'Disciplina', type: 'text' },
        'Semestre da monitoria': { pdfField: 'ac_semestre', displayLabel: 'Semestre', type: 'text' },
        'Carga horária semanal': { pdfField: 'ac_carga_horaria', displayLabel: 'C.H. Semanal', type: 'text' },
        
        // AC07 - Organização de Evento Acadêmico
        'Nome do evento organizado': { pdfField: 'ac_evento', displayLabel: 'Evento', type: 'text' },
        
        // AC08 - Programa de Intercâmbio de Graduação
        'Nome do programa de intercâmbio': { pdfField: 'ac_nome', displayLabel: 'Programa', type: 'text' },
        'Data de início do intercâmbio': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Início', type: 'date' },
        'Data de fim do intercâmbio': { pdfField: ['ac_dia_fim', 'ac_mes_fim', 'ac_ano_fim'], displayLabel: 'Fim', type: 'date' },
        
        // AC09 - Enquetes Institucionais
        'É o último semestre cursado? (sim/não)': { pdfField: 'ac_ultimo_semestre', displayLabel: 'Último Semestre', type: 'select' },
        'Número de enquetes respondidas': { pdfField: 'ac_quantidade_enquetes', displayLabel: 'Enquetes', type: 'text' },
        
        // PR01 - Estágio Supervisionado não obrigatório
        'Nome da empresa': { pdfField: 'ac_nome', displayLabel: 'Empresa', type: 'text' },
        'Data de início do estágio': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Início', type: 'date' },
        'Data de fim do estágio': { pdfField: ['ac_dia_fim', 'ac_mes_fim', 'ac_ano_fim'], displayLabel: 'Fim', type: 'date' },
        
        // PR02, PR03 - Programa PIBEP/SPINE
        'Nome do projeto desenvolvido': { pdfField: 'ac_projeto', displayLabel: 'Projeto', type: 'text' },
        
        // PR04 - Projeto de Empresa Junior
        'Nome da Empresa Júnior': { pdfField: 'ac_nome', displayLabel: 'Empresa Jr.', type: 'text' },
        'Data de fim da participação': { pdfField: ['ac_dia_fim', 'ac_mes_fim', 'ac_ano_fim'], displayLabel: 'Fim', type: 'date' },
        
        // PQ01 - Programa de Iniciação Científica
        'Nome do projeto de pesquisa': { pdfField: 'ac_nome', displayLabel: 'Projeto', type: 'text' },
        
        // PQ02 - Projetos de Pesquisa como colaborador
        'Nome do projeto ou grupo de pesquisa': { pdfField: 'ac_nome', displayLabel: 'Projeto/Grupo', type: 'text' },
        
        // PQ03 - Evento Científico como ouvinte
        'Nome do evento científico': { pdfField: 'ac_evento', displayLabel: 'Evento', type: 'text' },
        'Carga horária (mínimo de 8 horas)': { pdfField: 'ac_carga_horaria', displayLabel: 'C.H.', type: 'text' },
        
        // PQ04 - Apresentação de trabalho em Evento Científico
        'Título do trabalho apresentado': { pdfField: 'ac_titulo', displayLabel: 'Título', type: 'text' },
        'Data de início da apresentação': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Apresentação', type: 'date' },
        
        // PQ05, PQ06, PQ07 - Publicação de artigo científico
        'Título do artigo': { pdfField: 'ac_titulo', displayLabel: 'Título', type: 'text' },
        'Nome do periódico ou congresso': { pdfField: 'ac_nome', displayLabel: 'Periódico', type: 'text' },
        'Data da publicação': { pdfField: ['ac_dia', 'ac_mes', 'ac_ano'], displayLabel: 'Publicação', type: 'date' },
        
        // CE01 - Cursos de idiomas
        'Nome do curso de idioma': { pdfField: 'ac_curso', displayLabel: 'Curso', type: 'text' },
        'Nome da instituição de ensino (com CNPJ e CNAE válidos)': { pdfField: 'ac_instituicao', displayLabel: 'Instituição', type: 'text' },
        'Carga horária total dos cursos de idiomas (horas)': { pdfField: 'ac_carga_horaria_total', displayLabel: 'C.H. Total', type: 'text' },
        
        // CE02 - Programa de Intercâmbio Cultural (reutiliza campos do AC08)
        
        // CE03 - Participação ativa em grupos artísticos
        'Nome do grupo e tipo de atividade (orquestra, teatro, etc.)': { pdfField: 'ac_grupo', displayLabel: 'Grupo', type: 'text' },
        
        // CE04 - Apresentações artísticas
        'Nome do evento (apresentação)': { pdfField: 'ac_evento', displayLabel: 'Apresentação', type: 'text' },
        'Data da apresentação': { pdfField: ['ac_dia', 'ac_mes', 'ac_ano'], displayLabel: 'Data', type: 'date' },
        
        // CE05 - Competição esportiva
        'Nome da competição esportiva': { pdfField: 'ac_nome', displayLabel: 'Competição', type: 'text' },
        'Data da competição': { pdfField: ['ac_dia', 'ac_mes', 'ac_ano'], displayLabel: 'Data', type: 'date' },
        
        // CE06 - Organização de Evento Cultural
        'Nome do evento cultural': { pdfField: 'ac_evento', displayLabel: 'Evento', type: 'text' },
        'Data do evento': { pdfField: ['ac_dia', 'ac_mes', 'ac_ano'], displayLabel: 'Data', type: 'date' },
        
        // IDC01 - Projetos da Diretoria de Identidade
        'Nome do projeto/programa': { pdfField: 'ac_nome', displayLabel: 'Projeto', type: 'text' },
        'Duração da participação (horas e minutos)': { pdfField: ['ac_horas', 'ac_minutos'], displayLabel: 'Duração', type: 'duration' },
        
        // IDC02 - Projetos de Voluntariado
        'Nome do projeto de voluntariado e instituição': { pdfField: 'ac_nome', displayLabel: 'Projeto', type: 'text' },
        
        // IDC03 - Centro Acadêmico
        'Nome do Centro Acadêmico ou Empresa Júnior': { pdfField: 'ac_nome_ca', displayLabel: 'Centro Acadêmico', type: 'text' },
        'Data de início do mandato': { pdfField: ['ac_dia_inicio', 'ac_mes_inicio', 'ac_ano_inicio'], displayLabel: 'Início Mandato', type: 'date' },
        'Data de fim do mandato': { pdfField: ['ac_dia_fim', 'ac_mes_fim', 'ac_ano_fim'], displayLabel: 'Fim Mandato', type: 'date' },
        
        // IDC04 - Eventos da Justiça Eleitoral
        'Função desempenhada (mesário, etc.)': { pdfField: 'ac_funcao', displayLabel: 'Função', type: 'text' },
        'Data do evento (eleição)': { pdfField: ['ac_dia', 'ac_mes', 'ac_ano'], displayLabel: 'Eleição', type: 'date' }
    };

    // Função para encontrar categoria por sigla
    function getCategoryData(sigla) {
        return acsData.manual_atividades_complementares.categorias.find(cat => cat.sigla === sigla);
    }

    // Função para encontrar subcategoria por código
    function getSubcategoryData(categorySigla, subcategoryCode) {
        const category = getCategoryData(categorySigla);
        return category ? category.atividades.find(ativ => ativ.codigo === subcategoryCode) : null;
    }

    // Função para atualizar estado da zona de drop baseado no limite
    function updateDropZoneState() {
        if (fileCount >= MAX_FILES) {
            dropZone.classList.add('disabled');
        } else {
            dropZone.classList.remove('disabled');
            const remaining = MAX_FILES - fileCount;
            if (fileCount === 0) {
                        } else {
            }
        }
    }

    // Função para processar arquivo (usado tanto para drag & drop quanto para clique)
    async function processFile(file) {
        if (!file) return;
        
        // Verifica se já atingiu o limite de arquivos
        if (fileCount >= MAX_FILES) {
            alert(`Você já atingiu o limite máximo de ${MAX_FILES} arquivos. Gere o arquivo ou exclua alguns arquivos para adicionar novos.`);
            return;
        }


        // Valida o arquivo
        const validationResult = validate_file(file.name, file.size);
        if (validationResult !== 'OK') {
            // Mostra alerta para o usuário
            alert(validationResult);
            return;
        }


        try {
            // Converte o arquivo para um ArrayBuffer e depois para Uint8Array
            const arrayBuffer = await file.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            // Adiciona o arquivo temporariamente
            await add_file_temporarily(file.name, fileData);

            // Armazena dados para uso nos modais
            currentFile = file;
            currentFileData = fileData;

            // Mostra modal de categoria
            categoryModal.style.display = 'flex';

        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            alert(`Erro ao processar ${file.name}. Verifique se o arquivo não está corrompido.`);
        }
    }

    // Função para criar HTML detalhado do arquivo
    function createFileDisplayHTML(fileName, category, subcategory, subcategoryData, formData) {
        // Obter nome da categoria completo
        const categoryData = getCategoryData(category);
        const categoryName = categoryData ? categoryData.categoria_nome : category;
        
        // Linha 1: Nome do arquivo e subcategoria (que já inclui a categoria)
        let html = `
            <div class="file-header">
                <span class="file-name">📄 ${fileName}</span>
                <span class="file-category">${subcategory}</span>
            </div>
        `;
        
        // Linha 2: Nome da atividade
        html += `
            <div class="file-activity">${subcategoryData.atividade}</div>
        `;
        
        // Linha 3: Detalhes específicos baseados nos dados do formulário
        let detailsItems = [];
        
        // Adiciona pontuação
        // detailsItems.push(`<span class="file-detail-item"><span class="file-detail-label">Pontuação:</span> ${subcategoryData.pontos}</span>`); // Campo removido conforme solicitação
        
        // Processa campos específicos do formData
        Object.keys(formData).forEach(key => {
            // Pula campos base que já são exibidos
            if (['ac_subcategoria'].includes(key)) { // Removidos ac_pontos e ac_atividade conforme solicitação
                return;
            }
            
            const value = formData[key];
            const labelKey = formatFieldLabel(key);
            
            // Formata valores especiais - pula campos que serão agrupados
            let displayValue = value;
            if (key.startsWith('ac_dia') || key.startsWith('ac_mes') || key.startsWith('ac_ano') || 
                key === 'ac_horas' || key === 'ac_minutos') {
                // Estes campos serão processados pelas funções de agrupamento
                return;
            }
            
            if (typeof value === 'string' && value.trim()) {
                detailsItems.push(`<span class="file-detail-item"><span class="file-detail-label">${labelKey}:</span> ${displayValue}</span>`);
            }
        });
        
        // Processa campos de data agrupados
        const dateFields = extractDateFields(formData);
        dateFields.forEach(dateInfo => {
            detailsItems.push(`<span class="file-detail-item"><span class="file-detail-label">${dateInfo.label}:</span> ${dateInfo.value}</span>`);
        });
        
        // Processa campos de duração agrupados
        const durationFields = extractDurationFields(formData);
        durationFields.forEach(durationInfo => {
            detailsItems.push(`<span class="file-detail-item"><span class="file-detail-label">${durationInfo.label}:</span> ${durationInfo.value}</span>`);
        });
        
        if (detailsItems.length > 0) {
            html += `<div class="file-details">${detailsItems.join('')}</div>`;
        }
        
        return html;
    }
    

    // Função auxiliar para formatar labels dos campos (REFATORADA)
    function formatFieldLabel(pdfFieldName) {
        // Busca em todos os mapeamentos para encontrar a displayLabel correspondente
        for (const [internalName, mapping] of Object.entries(COMPLETE_FIELD_MAPPING)) {
            if (mapping.pdfField === pdfFieldName || 
                (Array.isArray(mapping.pdfField) && mapping.pdfField.includes(pdfFieldName))) {
                return mapping.displayLabel;
            }
        }
        
        // Se não encontrou, tenta fallback para campos compostos de data/duração
        if (pdfFieldName.startsWith('ac_dia') || pdfFieldName.startsWith('ac_mes') || pdfFieldName.startsWith('ac_ano')) {
            if (pdfFieldName.includes('_inicio')) return 'Início';
            if (pdfFieldName.includes('_fim')) return 'Fim';
            return 'Data';
        }
        
        if (pdfFieldName === 'ac_horas' || pdfFieldName === 'ac_minutos') {
            return 'Duração';
        }
        
        // Fallback: capitaliza e remove underscores
        if (pdfFieldName.startsWith('ac_')) {
            return pdfFieldName.replace('ac_', '').replace(/_/g, ' ')
                .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        
        // Último recurso
        return pdfFieldName.charAt(0).toUpperCase() + pdfFieldName.slice(1);
    }
    
    // Função para extrair e agrupar campos de data
    function extractDateFields(formData) {
        const dateGroups = {};
        const dateFields = [];
        
        Object.keys(formData).forEach(key => {
            // Novos padrões: ac_dia, ac_mes, ac_ano, ac_dia_inicio, ac_mes_inicio, etc.
            if (key.startsWith('ac_dia') || key.startsWith('ac_mes') || key.startsWith('ac_ano')) {
                let baseKey = '';
                let dateType = '';
                
                if (key === 'ac_dia' || key === 'ac_mes' || key === 'ac_ano') {
                    baseKey = 'ac_data';
                    dateType = key.split('_')[1]; // dia, mes, ano
                } else if (key.includes('_inicio')) {
                    baseKey = 'ac_data_inicio';
                    dateType = key.replace('_inicio', '').split('_')[1]; // dia, mes, ano
                } else if (key.includes('_fim')) {
                    baseKey = 'ac_data_fim';
                    dateType = key.replace('_fim', '').split('_')[1]; // dia, mes, ano
                }
                
                if (!dateGroups[baseKey]) {
                    dateGroups[baseKey] = {};
                }
                
                if (dateType === 'dia') dateGroups[baseKey].day = formData[key];
                if (dateType === 'mes') dateGroups[baseKey].month = formData[key];
                if (dateType === 'ano') dateGroups[baseKey].year = formData[key];
            }
        });
        
        Object.keys(dateGroups).forEach(baseKey => {
            const date = dateGroups[baseKey];
            if (date.day && date.month && date.year) {
                let label = 'Data';
                if (baseKey === 'ac_data_inicio') label = 'Início';
                else if (baseKey === 'ac_data_fim') label = 'Fim';
                
                const value = `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
                dateFields.push({ label, value });
            }
        });
        
        return dateFields;
    }
    
    // Função para extrair e agrupar campos de duração
    function extractDurationFields(formData) {
        const durationFields = [];
        let hasHours = false;
        let hasMinutes = false;
        let hoursValue = 0;
        let minutesValue = 0;
        
        // Novos padrões: ac_horas, ac_minutos, ac_carga_horaria
        Object.keys(formData).forEach(key => {
            if (key === 'ac_horas') {
                hasHours = true;
                hoursValue = formData[key];
            } else if (key === 'ac_minutos') {
                hasMinutes = true;
                minutesValue = formData[key];
            } else if (key === 'ac_carga_horaria') {
                // Campo de carga horária especial
                durationFields.push({ 
                    label: 'C.H.', 
                    value: formData[key] 
                });
            }
        });
        
        // Se temos horas e/ou minutos, agrupa eles
        if (hasHours || hasMinutes) {
            let value = '';
            if (hoursValue && minutesValue) {
                value = `${hoursValue}h ${minutesValue}min`;
            } else if (hoursValue) {
                value = `${hoursValue}h`;
            } else if (minutesValue) {
                value = `${minutesValue}min`;
            }
            
            if (value) {
                durationFields.push({ label: 'Duração', value });
            }
        }
        
        return durationFields;
    }

    // Função para lidar com exclusão de arquivo
    async function handleFileDelete(fileName, listItem) {
        const confirmDelete = confirm(`Tem certeza que deseja excluir o arquivo "${fileName}"?\n\nEsta ação não pode ser desfeita.`);
        
        if (!confirmDelete) {
            return;
        }

        try {
            // Remove arquivo do sistema Rust
            await remove_processed_file(fileName);
            
            // Remove da UI
            listItem.remove();
            
            // Atualiza contador
            fileCount--;
            
            // Desabilita botão ZIP se não há mais arquivos
            if (fileCount === 0) {
                zipButton.disabled = true;
            }
            
            // Atualiza estado da zona de drop
            updateDropZoneState();
            
        } catch (error) {
            console.error('Erro ao excluir arquivo:', error);
            alert(`Erro ao excluir '${fileName}'. Tente novamente.`);
        }
    }

    // 4. Função para fechar modais sem remover arquivo (navegação entre modais)
    function closeModalsSoft() {
        categoryModal.style.display = 'none';
        subcategoryModal.style.display = 'none';
        detailsModal.style.display = 'none';
        
        // Limpa formulário dinâmico mas mantém dados de arquivo
        dynamicFormContainer.innerHTML = '';
    }

    // 5. Função para cancelar completamente (remove arquivo temporário)
    async function closeModalsAndCancel() {
        // Se há um arquivo temporário que não foi processado, remove ele
        if (currentFile && currentFile.name) {
            try {
                await remove_temporary_file(currentFile.name);
                console.log('Arquivo temporário removido:', currentFile.name);
            } catch (error) {
                console.error('Erro ao remover arquivo temporário:', error);
            }
        }
        
        categoryModal.style.display = 'none';
        subcategoryModal.style.display = 'none';
        detailsModal.style.display = 'none';
        currentFile = null;
        currentFileData = null;
        selectedCategory = null;
        selectedSubcategory = null;
        currentSubcategoryData = null;
        
        // Limpa formulário dinâmico
        dynamicFormContainer.innerHTML = '';
    }

    // 4. Event listeners para drag & drop
    dropZone.addEventListener('click', () => {
        // Verifica se está desabilitado
        if (dropZone.classList.contains('disabled')) {
            return;
        }
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        // Só adiciona o efeito visual se não está desabilitado
        if (!dropZone.classList.contains('disabled')) {
            dropZone.classList.add('drag-over');
        }
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        // Verifica se está desabilitado
        if (dropZone.classList.contains('disabled')) {
            return;
        }
        
        const files = e.dataTransfer.files;
        
        // Verifica se múltiplos arquivos foram arrastados
        if (files.length > 1) {
            alert('Por favor, arraste apenas um arquivo PDF por vez.\n\nVocê pode adicionar múltiplos arquivos repetindo o processo individualmente.');
            return;
        }
        
        if (files.length > 0) {
            await processFile(files[0]);
        }
    });

    // 5. Listener para input de arquivo (quando clica na zona)
    fileInput.addEventListener('change', async (event) => {
        // Verifica se está desabilitado
        if (dropZone.classList.contains('disabled')) {
            event.target.value = '';
            return;
        }
        
        await processFile(event.target.files[0]);
        // Limpa o valor do input
        event.target.value = '';
    });

    // 6. Listeners para fechar modais - diferentes comportamentos por modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', async (e) => {
            const modal = e.target.closest('.modal');
            if (modal === detailsModal) {
                // No modal de detalhes, cancela completamente
                await closeModalsAndCancel();
            } else if (modal === categoryModal) {
                // No modal de categoria, cancela completamente (primeira tela)
                await closeModalsAndCancel();
            } else {
                // No modal de subcategoria, apenas volta (não cancela tudo)
                subcategoryModal.style.display = 'none';
                categoryModal.style.display = 'flex';
            }
        });
    });

    window.addEventListener('click', async (event) => {
        if (event.target === categoryModal) {
            // Clicou fora do modal de categoria - cancela tudo
            await closeModalsAndCancel();
        } else if (event.target === subcategoryModal) {
            // Clicou fora do modal de subcategoria - volta para categoria
            subcategoryModal.style.display = 'none';
            categoryModal.style.display = 'flex';
        } else if (event.target === detailsModal) {
            // Clicou fora do modal de detalhes - cancela tudo
            await closeModalsAndCancel();
        }
    });

    // 5. Listener para seleção de categoria
    document.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', (e) => {
            selectedCategory = e.target.dataset.category;
            categoryModal.style.display = 'none';
            
            // Busca dados da categoria
            const categoryData = getCategoryData(selectedCategory);
            if (!categoryData) {
                alert('Erro: Dados da categoria não encontrados. Tente recarregar a página.');
                return;
            }
            
            // Configura o modal de subcategorias
            subcategoryTitle.textContent = `Selecione a atividade da categoria ${categoryData.categoria_nome}:`;
            
            // Gera botões de subcategoria
            subcategoryButtonsContainer.innerHTML = '';
            categoryData.atividades.forEach(atividade => {
                const button = document.createElement('button');
                button.className = 'subcategory-button';
                button.dataset.subcategory = atividade.codigo;
                button.innerHTML = `
                    <span class="subcategory-code">${atividade.codigo}</span>
                    <div class="subcategory-activity">${atividade.atividade}</div>
                `;
                subcategoryButtonsContainer.appendChild(button);
            });
            
            subcategoryModal.style.display = 'flex';
        });
    });

    // 6. Listener para seleção de subcategoria
    subcategoryButtonsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.subcategory-button');
        if (!button) return;
        
        selectedSubcategory = button.dataset.subcategory;
        currentSubcategoryData = getSubcategoryData(selectedCategory, selectedSubcategory);
        
        if (!currentSubcategoryData) {
            alert('Erro: Dados da subcategoria não encontrados. Tente recarregar a página.');
            return;
        }
        
        subcategoryModal.style.display = 'none';
        
        // Configura o modal de detalhes
        detailsTitle.textContent = `${selectedSubcategory} - ${currentSubcategoryData.atividade}`;
        detailsDescription.textContent = 'Preencha as informações obrigatórias conforme o certificado:';
        
        // Gera formulário dinâmico
        generateDynamicForm(currentSubcategoryData.informacoes_necessarias);
        
        detailsModal.style.display = 'flex';
    });

    // 7. Função para gerar formulário dinâmico
    function generateDynamicForm(informacoesNecessarias) {
        dynamicFormContainer.innerHTML = '';
        
        informacoesNecessarias.forEach((info, index) => {
            // Pula o certificado PDF pois já é fornecido
            if (info.toLowerCase().includes('pdf') || info.toLowerCase().includes('certificado')) {
                return;
            }
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = info + ':';
            
            let input;
            if (info.toLowerCase().includes('data')) {
                // Campo de data
                input = createDateInput(index);
            } else if (info.toLowerCase().includes('duração') || (info.toLowerCase().includes('carga horária') && !info.toLowerCase().includes('total dos cursos de idiomas'))) {
                // Campo de duração
                input = createDurationInput(index);
            } else if (info.toLowerCase().includes('último semestre')) {
                // Campo sim/não
                input = createYesNoInput(index);
            } else {
                // Campo de texto padrão
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-input';
                input.id = `field-${index}`;
                input.required = true;
            }
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            dynamicFormContainer.appendChild(formGroup);
        });
    }

    // 8. Funções auxiliares para tipos de input
    function createDateInput(index) {
        const container = document.createElement('div');
        container.className = 'date-group';
        
        const dayInput = document.createElement('input');
        dayInput.type = 'number';
        dayInput.className = 'form-input date-input';
        dayInput.id = `field-${index}-day`;
        dayInput.placeholder = 'Dia';
        dayInput.min = '1';
        dayInput.max = '31';
        dayInput.required = true;
        
        const monthInput = document.createElement('input');
        monthInput.type = 'number';
        monthInput.className = 'form-input date-input';
        monthInput.id = `field-${index}-month`;
        monthInput.placeholder = 'Mês';
        monthInput.min = '1';
        monthInput.max = '12';
        monthInput.required = true;
        
        const yearInput = document.createElement('input');
        yearInput.type = 'number';
        yearInput.className = 'form-input date-input';
        yearInput.id = `field-${index}-year`;
        yearInput.placeholder = 'Ano';
        yearInput.min = '2000';
        yearInput.max = '2030';
        yearInput.required = true;
        
        container.appendChild(dayInput);
        container.appendChild(monthInput);
        container.appendChild(yearInput);
        
        return container;
    }

    function createDurationInput(index) {
        const container = document.createElement('div');
        container.className = 'duration-group';
        
        const hoursInput = document.createElement('input');
        hoursInput.type = 'number';
        hoursInput.className = 'form-input duration-input';
        hoursInput.id = `field-${index}-hours`;
        hoursInput.placeholder = '0';
        hoursInput.min = '0';
        hoursInput.required = true;
        
        const minutesInput = document.createElement('input');
        minutesInput.type = 'number';
        minutesInput.className = 'form-input duration-input';
        minutesInput.id = `field-${index}-minutes`;
        minutesInput.placeholder = '0';
        minutesInput.min = '0';
        minutesInput.max = '59';
        
        const hoursLabel = document.createElement('span');
        hoursLabel.textContent = ' horas ';
        
        const minutesLabel = document.createElement('span');
        minutesLabel.textContent = ' minutos';
        
        container.appendChild(hoursInput);
        container.appendChild(hoursLabel);
        container.appendChild(minutesInput);
        container.appendChild(minutesLabel);
        
        return container;
    }

    function createYesNoInput(index) {
        const select = document.createElement('select');
        select.className = 'form-input';
        select.id = `field-${index}`;
        select.required = true;
        
        const optionDefault = document.createElement('option');
        optionDefault.value = '';
        optionDefault.textContent = 'Selecione...';
        
        const optionYes = document.createElement('option');
        optionYes.value = 'sim';
        optionYes.textContent = 'Sim';
        
        const optionNo = document.createElement('option');
        optionNo.value = 'não';
        optionNo.textContent = 'Não';
        
        select.appendChild(optionDefault);
        select.appendChild(optionYes);
        select.appendChild(optionNo);
        
        return select;
    }

    // 9. Função para validar formulário dinâmico
    function validateDynamicForm() {
        const inputs = dynamicFormContainer.querySelectorAll('input[required], select[required]');
        
        for (const input of inputs) {
            if (!input.value.trim()) {
                alert(`Por favor, preencha o campo obrigatório.`);
                input.focus();
                return false;
            }
            
            // Validações específicas
            if (input.type === 'number') {
                const value = parseInt(input.value);
                if (input.min && value < parseInt(input.min)) {
                    alert(`Valor deve ser no mínimo ${input.min}.`);
                    input.focus();
                    return false;
                }
                if (input.max && value > parseInt(input.max)) {
                    alert(`Valor deve ser no máximo ${input.max}.`);
                    input.focus();
                    return false;
                }
            }
        }
        
        // Validação de datas: verifica se data final é maior que inicial
        const informacoesNecessarias = currentSubcategoryData.informacoes_necessarias;
        let startDateFields = null;
        let endDateFields = null;
        
        informacoesNecessarias.forEach((info, index) => {
            if (info.toLowerCase().includes('data')) {
                if (info.toLowerCase().includes('início') || info.toLowerCase().includes('inicio')) {
                    const day = document.getElementById(`field-${index}-day`);
                    const month = document.getElementById(`field-${index}-month`);
                    const year = document.getElementById(`field-${index}-year`);
                    if (day && month && year && day.value && month.value && year.value) {
                        startDateFields = {
                            day: parseInt(day.value),
                            month: parseInt(month.value),
                            year: parseInt(year.value),
                            label: info
                        };
                    }
                } else if (info.toLowerCase().includes('fim') || info.toLowerCase().includes('final') || info.toLowerCase().includes('término') || info.toLowerCase().includes('termino')) {
                    const day = document.getElementById(`field-${index}-day`);
                    const month = document.getElementById(`field-${index}-month`);
                    const year = document.getElementById(`field-${index}-year`);
                    if (day && month && year && day.value && month.value && year.value) {
                        endDateFields = {
                            day: parseInt(day.value),
                            month: parseInt(month.value),
                            year: parseInt(year.value),
                            label: info
                        };
                    }
                }
            }
        });
        
        // Se ambas as datas estão presentes, compara elas
        if (startDateFields && endDateFields) {
            const startDate = new Date(startDateFields.year, startDateFields.month - 1, startDateFields.day);
            const endDate = new Date(endDateFields.year, endDateFields.month - 1, endDateFields.day);
            
            if (endDate <= startDate) {
                alert('A data de fim deve ser posterior à data de início.');
                return false;
            }
        }
        
        return true;
    }

    // 10. Função para coletar dados do formulário dinâmico (REFATORADA)
    function collectFormData() {
        const formData = {};
        const informacoesNecessarias = currentSubcategoryData.informacoes_necessarias;
        
        informacoesNecessarias.forEach((info, index) => {
            // Pula certificado PDF
            if (info.toLowerCase().includes('pdf') || info.toLowerCase().includes('certificado')) {
                return;
            }
            
            // Busca mapeamento na tabela integrada
            let mapping = COMPLETE_FIELD_MAPPING[info];
            
            if (!mapping) {
                console.warn(`Mapeamento não encontrado para campo: "${info}"`);
                console.warn(`Subcategoria atual: ${selectedSubcategory}`);
                console.warn(`Campos disponíveis:`, Object.keys(COMPLETE_FIELD_MAPPING).filter(k => k.includes(info.split(' ')[0])));
                return;
            }
            
            // Processa baseado no tipo do campo
            if (mapping.type === 'text' || mapping.type === 'select') {
                // Campo simples
                const input = document.getElementById(`field-${index}`);
                if (input && input.value) {
                    formData[mapping.pdfField] = input.value;
                }
            } else if (mapping.type === 'date') {
                // Campo de data
                const day = document.getElementById(`field-${index}-day`)?.value;
                const month = document.getElementById(`field-${index}-month`)?.value;
                const year = document.getElementById(`field-${index}-year`)?.value;
                
                if (day && month && year) {
                    formData[mapping.pdfField[0]] = parseInt(day);   // ac_dia_*
                    formData[mapping.pdfField[1]] = parseInt(month); // ac_mes_*
                    formData[mapping.pdfField[2]] = parseInt(year);  // ac_ano_*
                }
            } else if (mapping.type === 'duration') {
                // Campo de duração
                const hours = document.getElementById(`field-${index}-hours`)?.value;
                const minutes = document.getElementById(`field-${index}-minutes`)?.value;
                
                formData[mapping.pdfField[0]] = parseInt(hours) || 0;    // ac_horas
                if (minutes !== undefined && minutes !== '') {
                    formData[mapping.pdfField[1]] = parseInt(minutes) || 0; // ac_minutos
                }
            }
        });
        
        return formData;
    }

    // 11. Listener para confirmar detalhes
    document.getElementById('submit-details').addEventListener('click', async () => {
        // Valida formulário
        if (!validateDynamicForm()) {
            return;
        }

        // Coleta dados do formulário
        const formData = collectFormData();
        
        // Adiciona informações da subcategoria com nomes mapeados
        formData[COMPLETE_FIELD_MAPPING['codigoSubcategoria'].pdfField] = selectedSubcategory;
        // Campos removidos conforme solicitação: nomeAtividade e pontos
        
        const details = JSON.stringify(formData);

        try {
            // Adiciona os metadados
            await add_file_metadata(currentFile.name, selectedCategory, details);
            
            // Atualiza a UI com detalhes completos
            const listItem = document.createElement('li');
            listItem.dataset.fileName = currentFile.name;
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            // Cria estrutura detalhada do arquivo
            fileInfo.innerHTML = createFileDisplayHTML(currentFile.name, selectedCategory, selectedSubcategory, currentSubcategoryData, formData);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = '🗑️ Excluir';
            deleteButton.addEventListener('click', () => handleFileDelete(listItem.dataset.fileName, listItem));
            
            listItem.appendChild(fileInfo);
            listItem.appendChild(deleteButton);
            // Adiciona no topo da lista (ordem inversa)
            fileList.insertBefore(listItem, fileList.firstChild);

            fileCount++;
            zipButton.disabled = false;
            
            // Atualiza estado da zona de drop
            updateDropZoneState();

            // Arquivo processado com sucesso, limpa a referência para não ser removido
            const processedFileName = currentFile.name;
            currentFile = null;
            
            // Fecha modais sem remover arquivo (já processado)
            categoryModal.style.display = 'none';
            subcategoryModal.style.display = 'none';
            detailsModal.style.display = 'none';
            currentFileData = null;
            selectedCategory = null;
            selectedSubcategory = null;
            currentSubcategoryData = null;
            dynamicFormContainer.innerHTML = '';

        } catch (error) {
            console.error("Erro ao adicionar metadados:", error);
            alert(`Erro ao processar metadados de ${currentFile.name}. Tente novamente.`);
            closeModalsAndCancel();
        }
    });

    // 12. Listener para cancelar detalhes
    document.getElementById('cancel-details').addEventListener('click', async () => {
        await closeModalsAndCancel();
    });

    // Função para inserir metadados em um PDF usando pdf-lib
    async function addMetadataToPdf(pdfBytes, metadata, fileName) {
        try {
            console.log(`Processando metadados para ${fileName}:`, metadata);
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            
            // Define metadados principais com codificação UTF-8
            // Campo ac_nome_arquivo removido conforme solicitação
            // if (metadata.ac_nome_arquivo) {
            //     pdfDoc.setTitle(metadata.ac_nome_arquivo);
            //     console.log(`Título definido: ${metadata.ac_nome_arquivo}`);
            // }
            
            if (metadata.ac_categoria) {
                pdfDoc.setSubject(`Categoria: ${metadata.ac_categoria}`);
                console.log(`Categoria definida: ${metadata.ac_categoria}`);
            }
            
            pdfDoc.setProducer('ACPAC - Empacotador de Certificados de Atividades Complementares');
            const version = get_version();
            pdfDoc.setCreator(`Aatico v${version}`);
            pdfDoc.setCreationDate(new Date());
            pdfDoc.setModificationDate(new Date());
            
            // Insere metadados customizados individuais
            const context = pdfDoc.context;
            const infoDict = context.lookup(pdfDoc.getInfoDict());
            
            let customFieldsCount = 0;
            for (const [key, value] of Object.entries(metadata)) {
                try {
                    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
                    
                    // Cria string PDF com codificação BASE64 (mais eficiente que hex)
                    const pdfKey = PDFLib.PDFName.of(key);
                    
                    // Converte para UTF-16BE com BOM
                    const utf16Bytes = [];
                    utf16Bytes.push(0xFE, 0xFF); // BOM UTF-16BE
                    
                    for (let i = 0; i < valueStr.length; i++) {
                        const code = valueStr.charCodeAt(i);
                        utf16Bytes.push((code >> 8) & 0xFF); // byte alto
                        utf16Bytes.push(code & 0xFF);        // byte baixo
                    }
                    
                    // Converte para BASE64 (mais compacto que hex)
                    const uint8Array = new Uint8Array(utf16Bytes);
                    const base64String = btoa(String.fromCharCode(...uint8Array));
                    
                    // Cria objeto PDF String com prefixo para identificar BASE64
                    const pdfValue = PDFLib.PDFString.of(`UTF16BE:${base64String}`);
                    
                    // Cria entrada customizada no dicionário Info
                    infoDict.set(pdfKey, pdfValue);
                    customFieldsCount++;
                    
                    console.log(`Campo ${key}: ${valueStr.substring(0, 30)}... (base64: ${base64String.substring(0, 20)}...)`);
                } catch (e) {
                    console.warn(`Erro ao inserir campo customizado ${key}:`, e);
                }
            }
            
            console.log(`${customFieldsCount} campos customizados inseridos no PDF ${fileName}`);
            
            const modifiedPdfBytes = await pdfDoc.save();
            console.log(`PDF ${fileName} processado com sucesso. Tamanho original: ${pdfBytes.length}, novo: ${modifiedPdfBytes.length}`);
            
            // Verificação: recarrega o PDF modificado para confirmar metadados
            try {
                const verifyDoc = await PDFLib.PDFDocument.load(modifiedPdfBytes);
                console.log(`Verificação ${fileName} - Título: ${verifyDoc.getTitle()}`);
                console.log(`Verificação ${fileName} - Assunto: ${verifyDoc.getSubject()}`);
                console.log(`Verificação ${fileName} - Produtor: ${verifyDoc.getProducer()}`);
                
                // Verifica metadados customizados
                const verifyContext = verifyDoc.context;
                const verifyInfoDict = verifyContext.lookup(verifyDoc.getInfoDict());
                console.log(`Verificação ${fileName} - Campos customizados encontrados:`, Object.keys(metadata).length);
                
                // Mostra alguns campos customizados como exemplo
                Object.keys(metadata).slice(0, 3).forEach(key => {
                    try {
                        const customValue = verifyInfoDict.lookup(key);
                        if (customValue) {
                            console.log(`  ${key}: ${customValue}`);
                        }
                    } catch (e) {
                        // Campo não encontrado ou erro na leitura
                    }
                });
                
            } catch (e) {
                console.warn(`Erro na verificação de ${fileName}:`, e);
            }
            
            return modifiedPdfBytes;
        } catch (error) {
            console.error(`Erro ao inserir metadados no PDF ${fileName}:`, error);
            return pdfBytes; // Retorna PDF original se falhar
        }
    }

    // 13. Listener para o botão de zipar
    zipButton.addEventListener('click', async () => {
        if (fileCount === 0) {
            alert('Adicione pelo menos um arquivo PDF antes de gerar o arquivo .potx.');
            return;
        }


        try {
            // Obtém os arquivos com metadados do Rust
            const filesDataJson = get_files_with_metadata();
            const filesData = JSON.parse(filesDataJson);
            
            console.log('Dados obtidos do Rust:', filesData);
            console.log('Número de arquivos:', Object.keys(filesData).length);
            
            
            // Processa cada PDF com seus metadados
            const processedFiles = {};
            for (const [fileName, fileInfo] of Object.entries(filesData)) {
                
                // Decodifica o PDF de base64
                const pdfBytes = Uint8Array.from(atob(fileInfo.data), c => c.charCodeAt(0));
                
                // Insere metadados se existirem
                let processedPdfBytes = pdfBytes;
                if (fileInfo.metadata) {
                    processedPdfBytes = await addMetadataToPdf(pdfBytes, fileInfo.metadata, fileName);
                } else {
                    console.log(`Arquivo ${fileName} sem metadados`);
                }
                
                processedFiles[fileName] = {
                    data: processedPdfBytes,
                    metadata: fileInfo.metadata
                };
            }
            
            
            // Cria ZIP manualmente usando JSZip se disponível, ou continua com método original
            console.log('Verificando bibliotecas - JSZip:', typeof JSZip !== 'undefined', 'PDFLib:', typeof PDFLib !== 'undefined');
            
            if (typeof JSZip !== 'undefined' && typeof PDFLib !== 'undefined') {
                const zip = new JSZip();
                
                // Adiciona PDFs processados
                for (const [fileName, fileInfo] of Object.entries(processedFiles)) {
                    zip.file(fileName, fileInfo.data);
                    
                    // JSON de metadados removido - metadados agora estão embutidos no PDF
                }
                
                const zipData = await zip.generateAsync({type: 'uint8array'});
                
                
                // Cria um Blob com os dados do ZIP
                const blob = new Blob([zipData], { type: 'application/zip' });
                
                // Gera nome do arquivo com data e hora
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                const fileName = `Pacote_de_Certificados_de_Atividades_Complementares_${year}.${month}.${day}_${hours}.${minutes}.${seconds}.potx`;

                // Cria um link temporário para iniciar o download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Libera o objeto URL da memória
                URL.revokeObjectURL(url);
            } else {
                // Fallback para o método original sem metadados PDF
                const zipData = zip_and_clear_files();
                
                if (zipData.length === 0) {
                    alert('Nenhum arquivo foi processado. Tente adicionar arquivos novamente.');
                            return;
                }

                // Cria um Blob com os dados do ZIP
                const blob = new Blob([zipData], { type: 'application/zip' });

                // Gera nome do arquivo com data e hora
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                const fileName = `Pacote_de_Certificados_de_Atividades_Complementares_${year}.${month}.${day}_${hours}.${minutes}.${seconds}.potx`;

                // Cria um link temporário para iniciar o download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Libera o objeto URL da memória
                URL.revokeObjectURL(url);
            }

            // Limpa os dados do Rust (importante fazer isso após o processamento)
            try {
                zip_and_clear_files(); // Chama só para limpar a memória
                console.log('Memória Rust limpa com sucesso');
            } catch (e) {
                console.warn('Erro ao limpar memória Rust:', e);
            }

            // Limpa a UI
            fileList.innerHTML = '';
            fileCount = 0;
            zipButton.disabled = true;
            
            // Atualiza estado da zona de drop
            updateDropZoneState();

        } catch (error) {
            console.error("Erro ao zipar arquivos:", error);
            alert(`Erro ao gerar arquivo .potx: ${error}\n\nTente novamente. Se o problema persistir, recarregue a página.`);
        }
    });
}

run();
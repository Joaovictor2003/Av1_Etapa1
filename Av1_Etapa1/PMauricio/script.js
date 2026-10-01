// Mapas de partidos aceitos pelo sistema, indexados pelo número do partido.
const partidos = {
    "91": { nome: "PDisney", sigla: "PDisney" },
    "92": { nome: "PMarvel", sigla: "PMarvel" },
    "93": { nome: "PDC", sigla: "PDC" },
    "94": { nome: "PMauricio", sigla: "PMauricio" }
};

// Define qual partido esta página/pasta específica tem permissão para gerenciar
const partidoDestaPasta = "PMauricio";

// Arrays e variáveis de estado global da aplicação
const candidatos = [];              // Guarda a lista de filiados carregados do arquivo JSON
const registroCandidaturas = [];    // Guarda as candidaturas finalizadas e registradas
let numeroPartidoSelecionado = ""; // Guarda o número do partido validado atualmente (ex: "94")

// Regra do TSE: quantidade exata de dígitos necessária para cada tipo de cargo
const digitosPorCargo = {
    "Presidente": 2,
    "Governador(a)": 2,
    "Senador(a)": 3,
    "Deputado(a) Federal": 4,
    "Deputado(a) Estadual": 5
};

// Regra de limite máximo de candidatos permitidos por cargo nesta chapa/partido
const limitesPorCargo = {
    "Presidente": 1,
    "Governador(a)": 1,
    "Senador(a)": 2
};

/**
 * Carrega a lista de filiados a partir de um arquivo JSON externo.
 * @param {string} sigla Sigla do partido cujos candidatos devem ser filtrados.
 */
async function carregarCandidatos(sigla = partidoDestaPasta) {
    const resposta = await fetch("candidatos.json");
    if (!resposta.ok) {
        throw new Error("Não foi possível ler candidatos.json.");
    }

    const dados = await resposta.json();
    if (!Array.isArray(dados[sigla])) {
        throw new Error(`Não há filiados cadastrados para ${sigla}.`);
    }

    // Limpa o array global 'candidatos' mantendo a referência e insere os novos dados
    candidatos.splice(0, candidatos.length, ...dados[sigla].map((candidato) => ({
        ...candidato,
        cargo: "",
        numero: ""
    })));
    return candidatos;
}

/**
 * Valida se o número digitado para o candidato segue o padrão correto do cargo e partido.
 * Ex: Para Deputado Federal (4 dígitos) do partido 94, o número deve ser 94XX.
 */
function validarNumeroCandidato(numero, cargo, numeroPartido = numeroPartidoSelecionado) {
    const quantidadeDigitos = digitosPorCargo[cargo];
    
    // Valida se o cargo existe, se o partido tem 2 dígitos e se o número inicia com o número do partido
    return Boolean(quantidadeDigitos && /^\d{2}$/.test(numeroPartido) &&
        new RegExp(`^${numeroPartido}\\d{${quantidadeDigitos - 2}}$`).test(numero));
}

/**
 * Exibe mensagens de erro em um elemento de texto específico na tela.
 */
function exibirErro(elementoId, mensagem) {
    document.getElementById(elementoId).textContent = mensagem;
}

/**
 * Exibe feedback geral de ações (sucesso ou falha) para o usuário.
 */
function exibirFeedback(mensagem, sucesso = false) {
    const feedback = document.getElementById("msgFeedbackAcao");
    feedback.textContent = mensagem;
    feedback.className = sucesso ? "sucesso" : "erro";
}

/**
 * Processa e valida o número do partido digitado pelo usuário.
 */
function processarPartido() {
    const numero = document.getElementById("txtNumeroPartido").value.trim();
    const dadosPartido = partidos[numero];
    const lista = document.getElementById("lstCandidatos");
    
    // Reseta a interface do usuário antes da validação
    lista.replaceChildren();
    numeroPartidoSelecionado = "";
    document.getElementById("lblNomePartido").innerHTML = "<b>---</b>";
    document.getElementById("painelCandidato").style.display = "none";
    exibirErro("msgErroPartido", "");

    // Validação 1: O número do partido existe na constante 'partidos'?
    if (!dadosPartido) {
        exibirErro("msgErroPartido", "Partido inválido. Informe um número entre 91 e 94.");
        return;
    }
    
    // Validação 2: O partido informado bate com o partido gerenciado por esta pasta?
    if (dadosPartido.sigla !== partidoDestaPasta) {
        exibirErro("msgErroPartido", `Esta pasta registra somente filiados do ${partidoDestaPasta}.`);
        return;
    }

    // Se validado, atualiza o estado e carrega os candidatos no elemento <select>
    numeroPartidoSelecionado = numero;
    document.getElementById("lblNomePartido").innerHTML = `<b>${dadosPartido.nome}</b>`;
    
    carregarCandidatos(dadosPartido.sigla).then((filiados) => {
        filiados.forEach((candidato, indice) => {
            const opcao = document.createElement("option");
            opcao.value = String(indice);
            opcao.textContent = candidato.nome;
            lista.append(opcao);
        });
        exibirFeedback(`${filiados.length} filiados carregados.`, true);
    }).catch((erro) => {
        numeroPartidoSelecionado = "";
        exibirErro("msgErroPartido", `${erro.message} Abra a página por um servidor local.`);
    });
}

/**
 * Preenche o painel de informações ao selecionar um candidato na lista.
 */
function selecionarCandidato() {
    const indice = Number(document.getElementById("lstCandidatos").value);
    const candidato = candidatos[indice];
    if (!candidato) {
        return;
    }

    const cargo = document.getElementById("lstCargos").value;
    const numero = sugerirNumero(candidato, cargo);
    const imagem = document.getElementById("infoFoto");

    // Atualiza os elementos visuais com os dados do candidato
    document.getElementById("infoNome").textContent = candidato.nome;
    document.getElementById("infoCargo").textContent = cargo;
    document.getElementById("infoNumero").textContent = numero;
    imagem.src = candidato.foto;
    imagem.alt = `Foto de ${candidato.nome}`;
    document.getElementById("painelCandidato").style.display = "block";
    document.getElementById("txtNumeroCandidato").value = numero;
    exibirErro("msgErroNumero", "");
}

/**
 * Sugere um número vago disponível para o candidato com base no cargo selecionado.
 */
function sugerirNumero(candidato, cargo) {
    if (!numeroPartidoSelecionado || !digitosPorCargo[cargo]) {
        return "";
    }

    // Define a quantidade de dígitos do sufixo (ex: 4 dígitos totais - 2 do partido = sufixo de 2 dígitos)
    const tamanho = digitosPorCargo[cargo] - 2;
    if (tamanho === 0) {
        return numeroPartidoSelecionado; // Cargos como Presidente usam apenas os 2 dígitos do partido
    }

    // Busca o primeiro número ainda não utilizado em 'registroCandidaturas'
    const usados = new Set(registroCandidaturas.map((registro) => registro.numero));
    for (let sufixo = 1; sufixo < 10 ** tamanho; sufixo += 1) {
        const numero = `${numeroPartidoSelecionado}${String(sufixo).padStart(tamanho, "0")}`;
        if (!usados.has(numero)) {
            return numero; // Retorna a primeira opção livre encontrada
        }
    }
    return "";
}

/**
 * Recalcula e atualiza o número sugerido quando o usuário troca o cargo.
 */
function atualizarNumeroSugerido() {
    const candidato = candidatos[Number(document.getElementById("lstCandidatos").value)];
    if (!candidato) {
        return;
    }

    const cargo = document.getElementById("lstCargos").value;
    const numero = sugerirNumero(candidato, cargo);
    document.getElementById("txtNumeroCandidato").value = numero;
    document.getElementById("infoCargo").textContent = cargo;
    document.getElementById("infoNumero").textContent = numero || "Sem números disponíveis";
}

/**
 * Valida todas as regras de negócio e efetiva o registro de uma candidatura.
 */
function registrarCandidatura() {
    const candidato = candidatos[Number(document.getElementById("lstCandidatos").value)];
    const cargo = document.getElementById("lstCargos").value;
    const numero = document.getElementById("txtNumeroCandidato").value.trim();

    exibirErro("msgErroNumero", "");
    exibirFeedback("");

    // 1. Validação de preenchimento dos campos essenciais
    if (!numeroPartidoSelecionado || !candidato || !cargo || !numero) {
        exibirErro("msgErroNumero", "Selecione o partido, o candidato, o cargo e informe o número.");
        return;
    }

    // 2. Validação: O candidato já foi registrado para algum cargo?
    if (registroCandidaturas.some((registro) => registro.nome === candidato.nome)) {
        exibirErro("msgErroNumero", "Este candidato já foi indicado para um cargo.");
        return;
    }

    // 3. Validação: Limite máximo de vagas por cargo atingido?
    const limite = limitesPorCargo[cargo];
    if (limite && registroCandidaturas.filter((registro) => registro.cargo === cargo).length >= limite) {
        exibirErro("msgErroNumero", `O limite de ${limite} candidatura(s) para ${cargo} foi atingido.`);
        return;
    }

    // 4. Validação: Formato e quantidade de dígitos do número
    if (!validarNumeroCandidato(numero, cargo)) {
        exibirErro("msgErroNumero", `Número inválido para ${cargo}. Confira o prefixo do partido e a quantidade de dígitos.`);
        return;
    }

    // 5. Validação: O número já está em uso por outro candidato no mesmo cargo?
    if (registroCandidaturas.some((registro) => registro.numero === numero && registro.cargo === cargo)) {
        exibirErro("msgErroNumero", "Este número já está atribuído a outro candidato neste cargo.");
        return;
    }

    // Efetiva o registro no estado da aplicação
    const candidatura = { nome: candidato.nome, numero, foto: candidato.foto, cargo };
    registroCandidaturas.push(candidatura);
    candidato.cargo = cargo;
    candidato.numero = numero;

    // Adiciona o candidato registrado na lista HTML da interface
    const item = document.createElement("li");
    item.textContent = `${candidatura.nome} | ${candidatura.cargo} | ${candidatura.numero}`;
    document.getElementById("listaRegistrados").append(item);
    exibirFeedback("Candidatura registrada.", true);
}

/**
 * Salva as candidaturas registradas no localStorage do navegador e faz o download de um arquivo JSON.
 */
function gravarEEnviarTSE() {
    if (registroCandidaturas.length === 0) {
        exibirFeedback("Registre pelo menos uma candidatura antes de enviar.");
        return;
    }

    // Prepara a estrutura dos dados para exportação
    const payload = registroCandidaturas.map(({ nome, numero, foto, cargo }) => ({ nome, numero, foto, cargo }));
    
    // Cria um arquivo Blob contendo o JSON e dispara o download automático
    const arquivo = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${partidoDestaPasta}.json`;
    link.click();
    URL.revokeObjectURL(url); // Libera recursos da memória

    // Armazena uma cópia localmente no navegador
    localStorage.setItem(`${partidoDestaPasta}-candidaturas`, JSON.stringify(payload));
    exibirFeedback(`Chapa gravada e arquivo ${partidoDestaPasta}.json enviado para download.`, true);
}

// Configuração de ouvintes de eventos ao carregar todo o HTML da página
document.addEventListener("DOMContentLoaded", () => {
    // Atualiza a sugestão de número sempre que a seleção de cargo for alterada
    document.getElementById("lstCargos").addEventListener("change", atualizarNumeroSugerido);
});
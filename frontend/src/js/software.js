const statusConexao = document.getElementById("statusConexao");
const mensagemConexao = document.getElementById("mensagemConexao");
const botaoReconectar = document.getElementById("botaoReconectar");
const dadosRecebidos = document.getElementById("dadosRecebidos");
const horarioRecebimento = document.getElementById("horarioRecebimento");
const quantidadeMensagens = document.getElementById("quantidadeMensagens");

const enderecoConfigurado = document.body.dataset.websocketUrl.trim();
let enderecoWebSocket = "";
let conexaoWebSocket;
let temporizadorReconexao;
let tentativasReconexao = 0;
let totalMensagens = 0;
let manterReconexao = true;

function atualizarStatus(texto, classe) {
    statusConexao.textContent = texto;
    statusConexao.className = `estadoConexao ${classe}`;
}

function prepararEnderecoWebSocket() {
    const url = new URL(enderecoConfigurado);
    if (!["ws:", "wss:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("Use um endereço ws:// ou wss:// sem credenciais.");
    }
    if (window.location.protocol === "https:" && url.protocol !== "wss:") {
        throw new Error("Uma página HTTPS precisa usar uma conexão WSS.");
    }

    url.pathname = "/ws";
    url.search = "";
    url.searchParams.set("from", "site");
    url.hash = "";
    return url.toString();
}

function conectar() {
    if (!enderecoWebSocket || (conexaoWebSocket &&
        conexaoWebSocket.readyState <= WebSocket.OPEN)) {
        return;
    }

    clearTimeout(temporizadorReconexao);
    atualizarStatus("Conectando ao backend...", "estadoPendente");

    const novaConexao = new WebSocket(enderecoWebSocket);
    conexaoWebSocket = novaConexao;

    novaConexao.addEventListener("open", () => {
        if (conexaoWebSocket !== novaConexao) {
            return;
        }
        tentativasReconexao = 0;
        atualizarStatus("Conectado", "estadoConectado");
        mensagemConexao.textContent = "Aguardando dados do ESP32.";
    });

    novaConexao.addEventListener("message", (evento) => {
        if (conexaoWebSocket !== novaConexao) {
            return;
        }

        try {
            dadosRecebidos.textContent = JSON.stringify(JSON.parse(evento.data), null, 2);
        } catch {
            dadosRecebidos.textContent = evento.data;
        }

        totalMensagens += 1;
        quantidadeMensagens.textContent = String(totalMensagens);
        horarioRecebimento.textContent = new Date().toLocaleString("pt-BR");
        mensagemConexao.textContent = "Dados recebidos em tempo real; não são armazenados.";
    });

    novaConexao.addEventListener("error", () => {
        if (conexaoWebSocket === novaConexao) {
            atualizarStatus("Falha na conexão", "estadoFalha");
        }
    });

    novaConexao.addEventListener("close", () => {
        if (conexaoWebSocket !== novaConexao || !manterReconexao) {
            return;
        }

        conexaoWebSocket = undefined;
        atualizarStatus("Desconectado", "estadoFalha");
        mensagemConexao.textContent = "Tentando reconectar automaticamente.";

        const atraso = Math.min(1000 * (2 ** tentativasReconexao), 30000);
        tentativasReconexao += 1;
        temporizadorReconexao = setTimeout(conectar, atraso);
    });
}

if (!enderecoConfigurado) {
    atualizarStatus("Backend ainda não configurado", "estadoPendente");
    mensagemConexao.textContent = "O endereço WSS será configurado quando o servidor estiver pronto.";
    botaoReconectar.disabled = true;
} else {
    try {
        enderecoWebSocket = prepararEnderecoWebSocket();
        botaoReconectar.disabled = false;
        botaoReconectar.addEventListener("click", () => {
            tentativasReconexao = 0;
            conectar();
        });
        conectar();
    } catch (error) {
        atualizarStatus("Configuração inválida", "estadoFalha");
        mensagemConexao.textContent = error.message;
        botaoReconectar.disabled = true;
    }
}

window.addEventListener("pagehide", () => {
    manterReconexao = false;
    clearTimeout(temporizadorReconexao);
    conexaoWebSocket?.close();
});

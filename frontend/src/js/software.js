
const API_URL = "https://naturalsynergy.onrender.com";

const statusConexao = document.getElementById("statusConexao");
const mensagemConexao = document.getElementById("mensagemConexao");
const dadosRecebidos = document.getElementById("dadosRecebidos");
const quantidadeMensagens = document.getElementById("quantidadeMensagens");
const horarioRecebimento = document.getElementById("horarioRecebimento");
const botaoReconectar = document.getElementById("botaoReconectar");

let intervaloConsulta = null;

function atualizarStatus(status, mensagem) {
    statusConexao.textContent = mensagem;
    statusConexao.className = `estadoConexao estado${status}`;

    mensagemConexao.textContent =
        status === "Conectado"
            ? "Conexão estabelecida com o Natural Synergy."
            : mensagem;
}

function formatarNumero(valor, unidade) {
    return valor === null || valor === undefined
        ? "Sem leitura"
        : `${Number(valor).toFixed(2)} ${unidade}`;
}

async function buscarDados() {
    try {
        const resposta = await fetch(`${API_URL}/api/dados`, {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Falha ao consultar o backend.");
        }

        const resultado = await resposta.json();
        const dados = resultado.dados;

        atualizarStatus("Conectado", "Backend conectado");

        quantidadeMensagens.textContent = dados.quantidadeMensagens;

        horarioRecebimento.textContent = dados.recebidoEm
            ? new Date(dados.recebidoEm).toLocaleTimeString("pt-BR")
            : "Aguardando ESP32";

        let conteudo = [
            "MONITORAMENTO NATURAL SYNERGY",
            "------------------------------",
            "",
            `Batimentos cardíacos: ${formatarNumero(dados.batimentos, "BPM")}`,
            `Aceleração: ${formatarNumero(dados.aceleracao, "m/s²")}`,
            "",
            `Última atualização: ${
                dados.recebidoEm
                    ? new Date(dados.recebidoEm).toLocaleString("pt-BR")
                    : "Nenhuma mensagem recebida"
            }`,
            "",
            "ÚLTIMO ALERTA",
            "------------------------------"
        ];

        if (dados.ultimoAlerta) {
            conteudo.push(
                `Tipo: ${dados.ultimoAlerta.tipo}`,
                `Mensagem: ${dados.ultimoAlerta.mensagem}`,
                `Recebido em: ${new Date(
                    dados.ultimoAlerta.recebidoEm
                ).toLocaleString("pt-BR")}`
            );
        } else {
            conteudo.push("Nenhum alerta recebido.");
        }

        dadosRecebidos.textContent = conteudo.join("\n");

    } catch (erro) {
        atualizarStatus("Falha", "Não foi possível conectar ao backend.");

        console.error("Erro na telemetria:", erro);
    }
}

function iniciarMonitoramento() {
    if (intervaloConsulta) {
        clearInterval(intervaloConsulta);
    }

    buscarDados();

    intervaloConsulta = setInterval(buscarDados, 1000);
}

botaoReconectar.addEventListener("click", buscarDados);

iniciarMonitoramento();
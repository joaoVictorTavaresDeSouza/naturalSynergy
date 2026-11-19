
const token = localStorage.getItem("naturalSynergyToken");
const usuarioSalvo = localStorage.getItem("naturalSynergyUsuario");

const mensagem = document.querySelector("#mensagemPerfil");

if (!token || !usuarioSalvo) {
    window.location.replace("./login.html");
} else {
    try {
        const usuario = JSON.parse(usuarioSalvo);

        document.querySelector("#nomeUsuario").textContent =
            usuario.nome || "Não informado";

        document.querySelector("#emailUsuario").textContent =
            usuario.email || "Não informado";

    } catch (error) {
        localStorage.removeItem("naturalSynergyToken");
        localStorage.removeItem("naturalSynergyUsuario");
        window.location.replace("./login.html");
    }
}

document.querySelector("#botaoSair").addEventListener("click", () => {
    localStorage.removeItem("naturalSynergyToken");
    localStorage.removeItem("naturalSynergyUsuario");

    window.location.replace("./login.html");
});

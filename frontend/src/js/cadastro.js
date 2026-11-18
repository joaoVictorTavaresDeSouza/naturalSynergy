const formulario = document.querySelector(".formularioLogin");
const mensagem = document.querySelector("#mensagemCadastro");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.querySelector("#nome").value.trim();
    const email = document.querySelector("#email").value.trim();
    const senha = document.querySelector("#senha").value;
    const confirmarSenha = document.querySelector("#confirmar-senha").value;

    const botao = formulario.querySelector('button[type="submit"]');

    mensagem.textContent = "";
    mensagem.style.color = "";

    if (senha !== confirmarSenha) {
        mensagem.textContent = "As senhas não coincidem.";
        mensagem.style.color = "#d93025";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Cadastrando...";

    try {
        const resposta = await fetch("http://localhost:3000/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                senha,
                confirmarSenha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.message || "Não foi possível realizar o cadastro.");
        }

        mensagem.textContent = "Cadastro realizado com sucesso! Redirecionando...";
        mensagem.style.color = "#16803c";

        formulario.reset();

        setTimeout(() => {
            window.location.href = "./login.html";
        }, 1800);

    } catch (error) {
        console.error("Erro no cadastro:", error);

        mensagem.textContent =
            error.message || "Não foi possível conectar ao servidor.";

        mensagem.style.color = "#d93025";

    } finally {
        botao.disabled = false;
        botao.textContent = "Cadastrar";
    }
});
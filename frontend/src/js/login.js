const formulario = document.querySelector("#formularioLogin");

if (!formulario) {
    console.error("Formulário de login não encontrado.");
} else {
    // Cria o espaço para mensagens sem alterar o layout HTML.
    const mensagem = document.createElement("p");
    mensagem.id = "mensagemLogin";
    mensagem.setAttribute("role", "status");
    mensagem.setAttribute("aria-live", "polite");

    formulario.before(mensagem);

    formulario.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.querySelector("#email").value.trim();
        const senha = document.querySelector("#senha").value;

        const botao = formulario.querySelector('button[type="submit"]');

        mensagem.textContent = "";
        mensagem.style.color = "";

        botao.disabled = true;
        botao.textContent = "Entrando...";

        try {
            const resposta = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    senha
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.message || "Não foi possível realizar o login."
                );
            }

            if (!dados.token || !dados.usuario) {
                throw new Error("Resposta inválida do servidor.");
            }

            localStorage.setItem("naturalSynergyToken", dados.token);

            localStorage.setItem(
                "naturalSynergyUsuario",
                JSON.stringify(dados.usuario)
            );

            mensagem.textContent = "Login realizado! Redirecionando...";
            mensagem.style.color = "#16803c";

            setTimeout(() => {
                window.location.href = "./software.html";
            }, 1200);

        } catch (error) {
            console.error("Erro no login:", error);

            mensagem.textContent =
                error.message || "Não foi possível conectar ao servidor.";

            mensagem.style.color = "#d93025";

        } finally {
            botao.disabled = false;
            botao.textContent = "Entrar";
        }
    });
}

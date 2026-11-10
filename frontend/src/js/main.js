/* === CARREGAMENTO  DO LOADER AO ENTRAR === */

const MIN_TIME = 1350
window.addEventListener("load", () => {
    const loader = document.getElementById("loader")

    const startTime = performance.timing.navigationStart
    const elapsed = Date.now() - startTime
    const remaining = MIN_TIME - elapsed

    setTimeout(() => {
        document.body.classList.add("loaded")

        setTimeout(() => {
            loader.style.display = "none"
        }, 800);
    }, remaining > 0 ? remaining : 0)
})

// === MENU HAMBURGUER === //

const hamburger = document.getElementById('hamburguer')
const navMenu = document.getElementById('nav-menu')

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('active')
        hamburger.classList.toggle('open')
        hamburger.setAttribute('aria-expanded', String(isOpen))
        hamburger.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu')
    })
}
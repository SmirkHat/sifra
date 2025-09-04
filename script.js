class SmirkHatSifra {
  constructor() {
    this.apiBase = "https://smht.eu/sifra"
    this.currentMode = "encrypt"
    this.init()
  }

  init() {
    this.bindEvents()
    this.initTheme()
    this.updateUI()
  }

  bindEvents() {
    // Theme toggle
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.toggleTheme()
    })

    // Mode selector
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setMode(e.target.dataset.mode)
      })
    })

    // Form submission
    document.getElementById("cryptoForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleSubmit()
    })

    // Copy button
    document.getElementById("copyBtn").addEventListener("click", () => {
      this.copyResult()
    })

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") {
          e.preventDefault()
          this.handleSubmit()
        } else if (e.key === "k") {
          e.preventDefault()
          this.copyResult()
        }
      }
    })
  }

  initTheme() {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const theme = savedTheme || (prefersDark ? "dark" : "light")

    this.setTheme(theme)

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        this.setTheme(e.matches ? "dark" : "light")
      }
    })
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
    const themeIcon = document.querySelector(".theme-icon")
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙"
    localStorage.setItem("theme", theme)
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"
    this.setTheme(newTheme)
  }

  setMode(mode) {
    this.currentMode = mode

    // Update button states
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      const isActive = btn.dataset.mode === mode
      btn.classList.toggle("active", isActive)
      btn.setAttribute("aria-pressed", isActive)
    })

    this.updateUI()
  }

  updateUI() {
    const isEncrypt = this.currentMode === "encrypt"
    const textLabel = document.querySelector('label[for="textInput"]')
    const textInput = document.getElementById("textInput")
    const submitBtn = document.getElementById("submitBtn")
    const btnText = submitBtn.querySelector(".btn-text")

    textLabel.textContent = isEncrypt ? "Text k šifrování" : "Zašifrovaný text"
    textInput.placeholder = isEncrypt
      ? "Zadejte text, který chcete zašifrovat..."
      : "Zadejte zašifrovaný text (slova oddělená mezerami)..."
    btnText.textContent = isEncrypt ? "Zašifrovat" : "Dešifrovat"

    // Clear previous results
    this.hideResult()
    this.hideError()
  }

  async handleSubmit() {
    const textInput = document.getElementById("textInput")
    const passwordInput = document.getElementById("passwordInput")
    const submitBtn = document.getElementById("submitBtn")

    const text = textInput.value.trim()
    const password = passwordInput.value.trim()

    if (!text || !password) {
      this.showError("Prosím vyplňte všechna pole.")
      return
    }

    // Validate input lengths
    if (text.length > 1048576) {
      this.showError("Text je příliš dlouhý (maximum 1 048 576 znaků).")
      return
    }

    if (password.length > 256) {
      this.showError("Heslo je příliš dlouhé (maximum 256 znaků).")
      return
    }

    this.setLoading(true)
    this.hideError()

    try {
      const endpoint = this.currentMode === "encrypt" ? "/encrypt" : "/decrypt"
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        this.showResult(data)
      } else {
        throw new Error("Operace se nezdařila.")
      }
    } catch (error) {
      console.error("API Error:", error)
      this.showError(this.getErrorMessage(error))
    } finally {
      this.setLoading(false)
    }
  }

  getErrorMessage(error) {
    if (error.message.includes("Failed to fetch")) {
      return "Nepodařilo se připojit k serveru. Zkontrolujte internetové připojení."
    }
    if (error.message.includes("403")) {
      return "Přístup zamítnut. Tato stránka není autorizována pro použití API."
    }
    if (error.message.includes("400")) {
      return "Neplatný vstup. Zkontrolujte zadané údaje."
    }
    if (error.message.includes("405")) {
      return "Nepodporovaná metoda požadavku."
    }
    return error.message || "Došlo k neočekávané chybě."
  }

  showResult(data) {
    const resultSection = document.getElementById("resultSection")
    const resultText = document.getElementById("resultText")
    const resultStats = document.getElementById("resultStats")

    const isEncrypt = this.currentMode === "encrypt"
    const resultValue = isEncrypt ? data.data.encrypted : data.data.decrypted

    resultText.value = resultValue

    // Show statistics
    let statsText = ""
    if (isEncrypt) {
      statsText = `Počet slov: ${data.data.word_count}`
    } else {
      statsText = `Délka textu: ${data.data.length} znaků`
    }
    statsText += ` • Čas: ${new Date(data.timestamp * 1000).toLocaleString("cs-CZ")}`

    resultStats.textContent = statsText

    resultSection.classList.add("show")
    resultText.focus()
  }

  hideResult() {
    document.getElementById("resultSection").classList.remove("show")
  }

  showError(message) {
    const errorElement = document.getElementById("errorMessage")
    errorElement.textContent = message
    errorElement.classList.add("show")

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideError()
    }, 5000)
  }

  hideError() {
    document.getElementById("errorMessage").classList.remove("show")
  }

  setLoading(loading) {
    const submitBtn = document.getElementById("submitBtn")
    submitBtn.disabled = loading
    submitBtn.classList.toggle("loading", loading)
  }

  async copyResult() {
    const resultText = document.getElementById("resultText")

    if (!resultText.value) {
      this.showError("Není co kopírovat.")
      return
    }

    try {
      await navigator.clipboard.writeText(resultText.value)

      // Visual feedback
      const copyBtn = document.getElementById("copyBtn")
      const originalIcon = copyBtn.querySelector(".copy-icon").textContent
      copyBtn.querySelector(".copy-icon").textContent = "✅"

      setTimeout(() => {
        copyBtn.querySelector(".copy-icon").textContent = originalIcon
      }, 2000)
    } catch (error) {
      // Fallback for older browsers
      resultText.select()
      document.execCommand("copy")
      this.showError("Text byl zkopírován (fallback metoda).")
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SmirkHatSifra()
})

// Service Worker registration for offline support (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}

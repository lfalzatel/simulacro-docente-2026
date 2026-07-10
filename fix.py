import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'async function loginWithGoogle\(\) \{.*?\} catch \(error\) \{', re.DOTALL)
replacement = """async function loginWithGoogle() {
    if (typeof auth === 'undefined') {
        alert("Sistema de autenticación no disponible. Por favor recarga la página.");
        return;
    }
    console.log("Iniciando login con Google (Firebase)...");
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {"""
content = pattern.sub(replacement, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

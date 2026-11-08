# Correo de confirmación en el idioma del usuario (opcional)

Al registrarse, Monetra guarda el idioma elegido (`lang`). Para que el correo de confirmación llegue en ese idioma:

1. Supabase → **Authentication** → **Emails** (Email Templates) → **Confirm signup**.
2. Reemplaza el asunto y el contenido por lo siguiente y guarda.

**Asunto:**
```
{{ if eq .Data.lang "en" }}Confirm your Monetra account{{ else if eq .Data.lang "fr" }}Confirmez votre compte Monetra{{ else }}Confirma tu cuenta de Monetra{{ end }}
```

**Contenido (HTML):**
```html
{{ if eq .Data.lang "en" }}
<h2>Welcome to Monetra!</h2>
<p>Confirm your email to activate your account, then log in to start using the app.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p>
{{ else if eq .Data.lang "fr" }}
<h2>Bienvenue sur Monetra !</h2>
<p>Confirmez votre e-mail pour activer votre compte, puis connectez-vous pour utiliser l'application.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon e-mail</a></p>
{{ else }}
<h2>¡Bienvenido a Monetra!</h2>
<p>Confirma tu correo para activar tu cuenta y luego inicia sesión para usar la aplicación.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi correo</a></p>
{{ end }}
```

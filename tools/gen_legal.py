# Genera www/privacidad.html y www/terminos.html (es/en/fr). Edita los datos de contacto en CONTACT y vuelve a ejecutar: python3 tools/gen_legal.py
import html,os
B="https://carlosmejia181414.github.io/Monetra"
CONTACT=dict(nombre="[NOMBRE LEGAL O RESPONSABLE]",correo="[CORREO DE CONTACTO]",provincia="[PROVINCIA / PAÍS]",region="[REGIÓN DE SUPABASE]")
UPDATED={"es":"18 de noviembre de 2026","en":"November 18, 2026","fr":"18 novembre 2026"}
def L(es,en,fr): return {"es":es,"en":en,"fr":fr}
C=CONTACT
PRIV={
"title":L("Política de privacidad","Privacy policy","Politique de confidentialité"),
"sections":[
(L("1. Quién es responsable","1. Who is responsible","1. Qui est responsable"),
 L(f"Monetra es una aplicación web de finanzas personales operada por {C['nombre']}. Puedes escribirnos a {C['correo']} para cualquier tema de privacidad.",
   f"Monetra is a personal-finance web app operated by {C['nombre']}. You can write to us at {C['correo']} about any privacy matter.",
   f"Monetra est une application web de finances personnelles exploitée par {C['nombre']}. Écrivez-nous à {C['correo']} pour toute question de confidentialité.")),
(L("2. Qué datos recopilamos","2. What data we collect","2. Quelles données nous collectons"),
 L("<ul><li><b>Cuenta:</b> correo, nombre para mostrar, foto (opcional), idioma y moneda. Si entras con Google recibimos tu nombre, correo y foto de perfil.</li><li><b>Lo que registras:</b> movimientos, categorías, metas de ahorro, deudas y pagos, y los datos de tu hogar si usas esa función.</li><li><b>Uso anónimo del sitio:</b> página visitada, tipo de dispositivo, idioma, sitio de origen, un identificador aleatorio de sesión y el país (código de 2 letras). <b>No guardamos tu dirección IP</b> ni lo vinculamos a tu cuenta.</li><li><b>Almacenamiento del navegador:</b> tu sesión, tema, idioma y preferencias. No usamos cookies de publicidad ni rastreadores de terceros.</li></ul>",
   "<ul><li><b>Account:</b> email, display name, photo (optional), language and currency. If you sign in with Google we receive your name, email and profile photo.</li><li><b>What you record:</b> transactions, categories, savings goals, debts and payments, and your household data if you use that feature.</li><li><b>Anonymous site usage:</b> page visited, device type, language, referrer, a random session identifier and country (2-letter code). <b>We do not store your IP address</b> and do not link this to your account.</li><li><b>Browser storage:</b> your session, theme, language and preferences. We use no advertising cookies or third-party trackers.</li></ul>",
   "<ul><li><b>Compte :</b> courriel, nom affiché, photo (facultative), langue et devise. Si vous vous connectez avec Google, nous recevons votre nom, courriel et photo de profil.</li><li><b>Ce que vous enregistrez :</b> transactions, catégories, objectifs d'épargne, dettes et paiements, et les données de votre foyer si vous utilisez cette fonction.</li><li><b>Utilisation anonyme du site :</b> page visitée, type d'appareil, langue, provenance, identifiant de session aléatoire et pays (code à 2 lettres). <b>Nous ne conservons pas votre adresse IP</b> et ne la lions pas à votre compte.</li><li><b>Stockage du navigateur :</b> session, thème, langue et préférences. Nous n'utilisons ni témoins publicitaires ni traceurs tiers.</li></ul>")),
(L("3. Para qué los usamos","3. How we use it","3. Pourquoi nous les utilisons"),
 L("Para darte el servicio (guardar y mostrar tus finanzas, sincronizar entre dispositivos, compartir con tu hogar), proteger tu cuenta, limitar el uso de las funciones gratuitas y mejorar la app con estadísticas anónimas. No vendemos tus datos ni los usamos para publicidad.",
   "To provide the service (store and show your finances, sync across devices, share with your household), protect your account, enforce free-plan limits and improve the app with anonymous statistics. We do not sell your data or use it for advertising.",
   "Pour fournir le service (enregistrer et afficher vos finances, synchroniser vos appareils, partager avec votre foyer), protéger votre compte, appliquer les limites du forfait gratuit et améliorer l'application avec des statistiques anonymes. Nous ne vendons pas vos données et ne les utilisons pas pour la publicité.")),
(L("4. Con quién los compartimos","4. Who we share it with","4. Avec qui nous les partageons"),
 L(f"<ul><li><b>Supabase</b> (base de datos, autenticación, almacenamiento y funciones). Región: {C['region']}.</li><li><b>GitHub Pages</b> (alojamiento del sitio).</li><li><b>Anthropic</b> (IA), solo cuando usas el asesor, la guía, el escáner de boletas o el chat del sitio. Enviamos cifras resumidas, nombres de categorías, tus mensajes o la foto de la boleta; <b>no enviamos tu correo ni tu identificador de cuenta</b>.</li><li><b>Google</b> (inicio de sesión opcional y fuentes tipográficas) y servicios públicos de tipo de cambio (solo el código de moneda).</li><li><b>Tu hogar:</b> las personas que invitas ven lo que registres como compartido.</li></ul>También podemos divulgar datos si una ley lo exige.",
   f"<ul><li><b>Supabase</b> (database, authentication, storage and functions). Region: {C['region']}.</li><li><b>GitHub Pages</b> (site hosting).</li><li><b>Anthropic</b> (AI), only when you use the advisor, the guide, the receipt scanner or the site chat. We send summary figures, category names, your messages or the receipt photo; <b>we do not send your email or account identifier</b>.</li><li><b>Google</b> (optional sign-in and web fonts) and public exchange-rate services (currency code only).</li><li><b>Your household:</b> the people you invite see what you record as shared.</li></ul>We may also disclose data if required by law.",
   f"<ul><li><b>Supabase</b> (base de données, authentification, stockage et fonctions). Région : {C['region']}.</li><li><b>GitHub Pages</b> (hébergement du site).</li><li><b>Anthropic</b> (IA), uniquement lorsque vous utilisez le conseiller, le guide, le lecteur de reçus ou le clavardage du site. Nous envoyons des chiffres résumés, des noms de catégories, vos messages ou la photo du reçu ; <b>nous n'envoyons ni votre courriel ni votre identifiant de compte</b>.</li><li><b>Google</b> (connexion facultative et polices) et services publics de taux de change (code de devise seulement).</li><li><b>Votre foyer :</b> les personnes que vous invitez voient ce que vous enregistrez comme partagé.</li></ul>Nous pouvons aussi divulguer des données si la loi l'exige.")),
(L("5. Dónde se guardan y por cuánto tiempo","5. Where it is stored and for how long","5. Où et combien de temps"),
 L("Tus datos se guardan mientras tu cuenta exista. Los proveedores pueden procesar datos fuera de tu país o provincia. Cuando eliminas tu cuenta, tus datos se borran de inmediato de la base de datos; lo que registraste en un hogar compartido se conserva para los demás miembros. Las copias de seguridad del proveedor pueden tardar un tiempo adicional en rotar. Las estadísticas anónimas no se pueden vincular a ti.",
   "Your data is kept while your account exists. Providers may process data outside your country or province. When you delete your account, your data is removed from the database immediately; what you recorded in a shared household is kept for the other members. Provider backups may take additional time to rotate. Anonymous statistics cannot be linked to you.",
   "Vos données sont conservées tant que votre compte existe. Les fournisseurs peuvent traiter des données hors de votre pays ou province. Lorsque vous supprimez votre compte, vos données sont effacées immédiatement de la base ; ce que vous avez enregistré dans un foyer partagé est conservé pour les autres membres. Les sauvegardes du fournisseur peuvent prendre un délai supplémentaire pour être renouvelées. Les statistiques anonymes ne peuvent pas être liées à vous.")),
(L("6. Tus derechos","6. Your rights","6. Vos droits"),
 L(f"Puedes <b>ver y corregir</b> tus datos en la app, <b>descargar una copia</b> (Perfil → Descargar mis datos) y <b>eliminar tu cuenta y tus datos</b> (Perfil → Eliminar mi cuenta y mis datos). También puedes retirar tu consentimiento o hacer preguntas escribiendo a {C['correo']}.",
   f"You can <b>view and correct</b> your data in the app, <b>download a copy</b> (Profile → Download my data) and <b>delete your account and data</b> (Profile → Delete my account and data). You can also withdraw consent or ask questions by writing to {C['correo']}.",
   f"Vous pouvez <b>consulter et corriger</b> vos données dans l'application, <b>télécharger une copie</b> (Profil → Télécharger mes données) et <b>supprimer votre compte et vos données</b> (Profil → Supprimer mon compte et mes données). Vous pouvez aussi retirer votre consentement ou poser vos questions à {C['correo']}.")),
(L("7. Seguridad","7. Security","7. Sécurité"),
 L("Usamos conexión cifrada (HTTPS), reglas de acceso por usuario a nivel de base de datos para que nadie vea los datos de otra persona, claves guardadas solo en el servidor y límites de uso. Ningún sistema es 100 % infalible; si ocurriera un incidente que te afecte, te avisaremos como exige la ley.",
   "We use encrypted connections (HTTPS), per-user access rules at the database level so no one can see another person's data, keys stored only on the server and usage limits. No system is 100% infallible; if an incident affecting you occurs, we will notify you as the law requires.",
   "Nous utilisons des connexions chiffrées (HTTPS), des règles d'accès par utilisateur au niveau de la base pour que personne ne voie les données d'autrui, des clés stockées uniquement sur le serveur et des limites d'utilisation. Aucun système n'est infaillible à 100 % ; en cas d'incident vous touchant, nous vous aviserons comme l'exige la loi.")),
(L("8. Menores de edad","8. Minors","8. Mineurs"),
 L("Monetra no está dirigida a menores de 18 años.","Monetra is not directed at people under 18.","Monetra ne s'adresse pas aux personnes de moins de 18 ans.")),
(L("9. Cambios y contacto","9. Changes and contact","9. Modifications et contact"),
 L(f"Si cambiamos esta política publicaremos la nueva versión aquí con su fecha. Contacto: {C['correo']}.",
   f"If we change this policy we will publish the new version here with its date. Contact: {C['correo']}.",
   f"Si nous modifions cette politique, nous publierons la nouvelle version ici avec sa date. Contact : {C['correo']}.")),
]}
TERMS={
"title":L("Términos de uso","Terms of use","Conditions d'utilisation"),
"sections":[
(L("1. Aceptación","1. Acceptance","1. Acceptation"),
 L("Al crear una cuenta o usar Monetra aceptas estos términos y la Política de privacidad. Si no estás de acuerdo, no uses el servicio. Debes tener al menos 18 años.",
   "By creating an account or using Monetra you accept these terms and the Privacy policy. If you disagree, do not use the service. You must be at least 18.",
   "En créant un compte ou en utilisant Monetra, vous acceptez ces conditions et la Politique de confidentialité. Si vous n'êtes pas d'accord, n'utilisez pas le service. Vous devez avoir au moins 18 ans.")),
(L("2. El servicio","2. The service","2. Le service"),
 L("Monetra te ayuda a registrar ingresos y gastos, fijar metas de ahorro, seguir deudas y recibir sugerencias. Es una herramienta de organización: <b>no es asesoría financiera, legal, fiscal ni de inversión</b>. Tú tomas tus decisiones.",
   "Monetra helps you record income and expenses, set savings goals, track debts and receive suggestions. It is an organizing tool: <b>it is not financial, legal, tax or investment advice</b>. You make your own decisions.",
   "Monetra vous aide à enregistrer revenus et dépenses, fixer des objectifs d'épargne, suivre vos dettes et recevoir des suggestions. C'est un outil d'organisation : <b>ce n'est pas un conseil financier, juridique, fiscal ou d'investissement</b>. Vous prenez vos propres décisions.")),
(L("3. Tu cuenta","3. Your account","3. Votre compte"),
 L("Eres responsable de tu contraseña y de lo que ocurra en tu cuenta. Debes dar datos verdaderos y avisarnos si sospechas un acceso no autorizado. Una cuenta es personal.",
   "You are responsible for your password and for what happens in your account. Provide accurate information and tell us if you suspect unauthorized access. An account is personal.",
   "Vous êtes responsable de votre mot de passe et de ce qui se passe dans votre compte. Fournissez des informations exactes et signalez-nous tout accès non autorisé présumé. Un compte est personnel.")),
(L("4. Uso aceptable","4. Acceptable use","4. Utilisation acceptable"),
 L("No puedes: intentar acceder a datos de otras personas, atacar o sobrecargar el servicio, automatizar el uso para evadir los límites, subir contenido ilegal o malicioso, ni usar la IA para fines dañinos. Podemos suspender cuentas que incumplan esto.",
   "You may not: try to access other people's data, attack or overload the service, automate use to evade limits, upload illegal or malicious content, or use the AI for harmful purposes. We may suspend accounts that breach this.",
   "Vous ne pouvez pas : tenter d'accéder aux données d'autrui, attaquer ou surcharger le service, automatiser l'usage pour contourner les limites, téléverser du contenu illégal ou malveillant, ni utiliser l'IA à des fins nuisibles. Nous pouvons suspendre les comptes qui enfreignent ces règles.")),
(L("5. Planes y pagos","5. Plans and payments","5. Forfaits et paiements"),
 L("Hay un plan Gratis con límites y un plan Pro (hoy US$5 al mes, con prueba de 14 días). El pago con tarjeta se activará más adelante; antes de cobrarte te mostraremos el precio, la renovación y cómo cancelar. Podemos cambiar precios y límites avisando con anticipación.",
   "There is a Free plan with limits and a Pro plan (currently US$5 per month, with a 14-day trial). Card payment will be enabled later; before charging you we will show the price, renewal and how to cancel. We may change prices and limits with advance notice.",
   "Il existe un forfait Gratuit avec limites et un forfait Pro (actuellement 5 $ US par mois, avec essai de 14 jours). Le paiement par carte sera activé plus tard ; avant de vous facturer, nous afficherons le prix, le renouvellement et la façon d'annuler. Nous pouvons modifier les prix et limites avec préavis.")),
(L("6. Contenido de IA","6. AI content","6. Contenu généré par IA"),
 L("Las respuestas de la IA (asesor, guía, escáner de boletas) pueden contener errores. Revisa siempre los datos antes de confiar en ellos o guardarlos.",
   "AI responses (advisor, guide, receipt scanner) can contain errors. Always review the information before relying on or saving it.",
   "Les réponses de l'IA (conseiller, guide, lecteur de reçus) peuvent contenir des erreurs. Vérifiez toujours les informations avant de vous y fier ou de les enregistrer.")),
(L("7. Tus datos y nuestra propiedad","7. Your data and our property","7. Vos données et notre propriété"),
 L("Tus datos son tuyos; nos das permiso solo para almacenarlos y procesarlos para darte el servicio. El software, la marca y el diseño de Monetra pertenecen a su responsable. Puedes exportar o eliminar tus datos cuando quieras.",
   "Your data is yours; you give us permission only to store and process it to provide the service. Monetra's software, brand and design belong to its operator. You can export or delete your data at any time.",
   "Vos données vous appartiennent ; vous nous autorisez uniquement à les stocker et à les traiter pour fournir le service. Le logiciel, la marque et la conception de Monetra appartiennent à son exploitant. Vous pouvez exporter ou supprimer vos données à tout moment.")),
(L("8. Disponibilidad y responsabilidad","8. Availability and liability","8. Disponibilité et responsabilité"),
 L("Ofrecemos el servicio \"tal cual\", sin garantía de que sea continuo o libre de errores. En la medida que la ley lo permita, no somos responsables de pérdidas indirectas ni de decisiones financieras tomadas con la app, y nuestra responsabilidad total se limita a lo que hayas pagado en los últimos 12 meses. Nada de esto limita derechos que la ley no permite limitar.",
   "We provide the service \"as is\", with no guarantee that it will be uninterrupted or error-free. To the extent the law allows, we are not liable for indirect losses or financial decisions made using the app, and our total liability is limited to what you paid in the last 12 months. None of this limits rights that the law does not allow to be limited.",
   "Nous fournissons le service « tel quel », sans garantie de continuité ni d'absence d'erreurs. Dans la mesure permise par la loi, nous ne sommes pas responsables des pertes indirectes ni des décisions financières prises avec l'application, et notre responsabilité totale se limite à ce que vous avez payé au cours des 12 derniers mois. Rien de ceci ne limite les droits que la loi ne permet pas de limiter.")),
(L("9. Terminación","9. Termination","9. Résiliation"),
 L("Puedes dejar de usar Monetra y eliminar tu cuenta cuando quieras. Podemos suspender o cerrar cuentas que incumplan estos términos.",
   "You can stop using Monetra and delete your account at any time. We may suspend or close accounts that breach these terms.",
   "Vous pouvez cesser d'utiliser Monetra et supprimer votre compte à tout moment. Nous pouvons suspendre ou fermer les comptes qui enfreignent ces conditions.")),
(L("10. Ley aplicable y contacto","10. Governing law and contact","10. Droit applicable et contact"),
 L(f"Estos términos se rigen por las leyes de {C['provincia']}. Podemos actualizarlos; la versión vigente es la publicada aquí. Contacto: {C['correo']}.",
   f"These terms are governed by the laws of {C['provincia']}. We may update them; the current version is the one published here. Contact: {C['correo']}.",
   f"Ces conditions sont régies par les lois de {C['provincia']}. Nous pouvons les mettre à jour ; la version en vigueur est celle publiée ici. Contact : {C['correo']}.")),
]}
LABEL={"es":("Última actualización","Volver al inicio","Política de privacidad","Términos de uso"),"en":("Last updated","Back to home","Privacy policy","Terms of use"),"fr":("Dernière mise à jour","Retour à l'accueil","Politique de confidentialité","Conditions d'utilisation")}
CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'"
def page(doc,fname,other):
    body=""
    for lg in ("es","en","fr"):
        lab=LABEL[lg]
        sec="".join(f"<h2>{s[0][lg]}</h2><p>{s[1][lg]}</p>" if not s[1][lg].startswith("<ul>") else f"<h2>{s[0][lg]}</h2>{s[1][lg]}" for s in doc["sections"])
        sec=sec.replace("</ul>","</ul><p>",1).replace("</p></p>","</p>") if False else sec
        body+=f'<main data-l="{lg}" hidden><h1>{doc["title"][lg]}</h1><p class="up">{lab[0]}: {UPDATED[lg]}</p>{sec}<p class="nav"><a href="index.html">← {lab[1]}</a> · <a href="privacidad.html">{lab[2]}</a> · <a href="terminos.html">{lab[3]}</a></p></main>'
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="{CSP}" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Monetra · {doc["title"]["es"]}</title>
<meta name="description" content="Monetra - {doc["title"]["es"]}" />
<link rel="canonical" href="{B}/{fname}" />
<link rel="icon" type="image/png" href="favicon.png" />
<style>
:root{{--bg:#fff4f0;--tx:#2a0f3a;--mu:#6b5a76;--card:#fff;--ln:#eadbe6;--ac:#7c3aed}}
@media (prefers-color-scheme:dark){{:root{{--bg:#111014;--tx:#f3eef7;--mu:#b6a9c2;--card:#1b1a20;--ln:#34313d;--ac:#b794f6}}}}
body{{margin:0;background:var(--bg);color:var(--tx);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}}
main{{max-width:820px;margin:0 auto;padding:28px 20px 56px}}
h1{{font-size:1.9rem;margin:.2em 0 .1em}} h2{{font-size:1.15rem;margin:1.6em 0 .3em}}
.up{{color:var(--mu);font-size:.9rem;margin:0 0 1em}} ul{{padding-left:1.2em}} li{{margin:.4em 0}}
a{{color:var(--ac)}} .nav{{margin-top:2.4em;border-top:1px solid var(--ln);padding-top:1em;font-size:.95rem}}
.lang{{position:fixed;top:10px;right:12px;display:flex;gap:6px}} .lang button{{background:var(--card);color:var(--tx);border:1px solid var(--ln);border-radius:8px;padding:4px 10px;cursor:pointer}}
.lang button[aria-pressed=true]{{border-color:var(--ac);color:var(--ac);font-weight:600}}
</style></head><body>
<div class="lang" role="group" aria-label="Language"><button data-set="es">ES</button><button data-set="en">EN</button><button data-set="fr">FR</button></div>
{body}
<script>
(function(){{
  var L="es";try{{L=localStorage.getItem("mb_lang")||""}}catch(e){{}}
  if(["es","en","fr"].indexOf(L)<0)L=((navigator.language||"es").slice(0,2));
  if(["es","en","fr"].indexOf(L)<0)L="es";
  function set(l){{document.documentElement.lang=l;document.querySelectorAll("main[data-l]").forEach(function(m){{m.hidden=m.getAttribute("data-l")!==l}});
    document.querySelectorAll(".lang button").forEach(function(b){{b.setAttribute("aria-pressed",String(b.getAttribute("data-set")===l))}});
    var t={{es:{json_t(doc,"es")},en:{json_t(doc,"en")},fr:{json_t(doc,"fr")}}};document.title="Monetra · "+t[l];}}
  document.querySelectorAll(".lang button").forEach(function(b){{b.addEventListener("click",function(){{var l=b.getAttribute("data-set");try{{localStorage.setItem("mb_lang",l)}}catch(e){{}};set(l)}})}});
  set(L);
}})();
</script></body></html>'''
import json
def json_t(doc,l): return json.dumps(doc["title"][l],ensure_ascii=False)
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","www")
open(os.path.join(root,"privacidad.html"),"w",encoding="utf-8").write(page(PRIV,"privacidad.html","terminos.html"))
open(os.path.join(root,"terminos.html"),"w",encoding="utf-8").write(page(TERMS,"terminos.html","privacidad.html"))
print("ok")

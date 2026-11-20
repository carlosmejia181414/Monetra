# Catálogo de pruebas de Monetra

**Regla:** cuando digas **"ejecutar test"** se corre `./tests/run-all.sh` (todas las suites de abajo). Modo corto: `./tests/run-all.sh rapido`.
El resultado queda en `tests/ULTIMO-INFORME.md`. Todo test nuevo se agrega a ese mismo ejecutor.

## Las 30 pruebas de calidad
| # | Prueba | Suite(s) que la cubre |
|---|---|---|
| 1 | Funcional | Funcional, Móvil, Análisis, Planes, Metas, Guía IA, Deudas, Matemática de deudas |
| 2 | Integración | Pantallas + SQL funcional/RLS + API de funciones |
| 3 | E2E | E2E (flujos completos), Privacidad (eliminar cuenta) |
| 4 | Regresión | Todo el ejecutor repetido tras cada cambio |
| 5 | Humo | Estático (recursos), Instalación desde el zip |
| 6 | Integridad de datos | SQL funcional/hogar/metas/deudas, BD (respaldo, decimales) |
| 7 | API | API: 5 Edge Functions |
| 8 | Errores y recuperación | E2E, Navegador (sin red), API (fallos de Anthropic) |
| 9 | Migración de BD | Migración x2, BD (reinstalar sobre datos), Estático (sin DROP) |
| 10 | Respaldo y restauración | BD (pg_dump/pg_restore) |
| 11 | Rendimiento | Rendimiento web, BD (consulta con 560 mil filas) |
| 12 | Carga | BD (pgbench 10/50/90 clientes) |
| 13 | Estrés | BD (90 clientes escribiendo), IA (200 simultáneos) |
| 14 | Concurrencia | BD (20 altas paralelas), IA (cuotas atómicas) |
| 15 | UAT | ⛔ requiere personas reales (guion en el informe de calidad) |
| 16 | Multi-navegador | 🟡 solo Chromium disponible aquí |
| 17 | Responsive | Navegador (7 anchos × 9 secciones), Móvil |
| 18 | Accesibilidad | Accesibilidad axe, UI, Navegador (teclado, foco en modales) |
| 19 | Monitoreo | 🟡 revisión manual (sin alertas automáticas) |
| 20 | Despliegue y rollback | Estático (pages.yml válido), Instalación |
| 21 | Usabilidad | 🟡 UI + revisión heurística; falta prueba con personas |
| 22 | i18n | i18n (informativo), Funcional en es/en/fr, Privacidad (3 idiomas) |
| 23 | Escalabilidad | BD (índices con 560 mil filas) |
| 24 | Resistencia (soak) | Navegador (540 cambios de sección, memoria) |
| 25 | Compatibilidad | 🟡 ver 16 |
| 26 | Instalación/actualización | Instalación desde el zip, Migración x2 |
| 27 | SEO | Estático (robots, sitemap, canonical, OG, JSON-LD, noindex) |
| 28 | Pagos | ⛔ Stripe aún no existe |
| 29 | Offline / red | Navegador (sin red, tipo de cambio caído) |
| 30 | Recuperación ante desastres | BD (restauración) + 🟡 respaldos de tu Supabase |

## Las 40 pruebas de seguridad
| # | Prueba | Suite(s) |
|---|---|---|
| 1 | Autenticación | 🟡 la gestiona Supabase Auth (checklist de panel) |
| 2-3, 32, 34 | Autorización, IDOR/BOLA, mass assignment, exfiltración | Seguridad SQL (45 ataques) |
| 4 | Inyección | Estático (sin SQL dinámico) + fuzz |
| 5 | XSS | XSS básica, XSS ampliada, CSP |
| 6-8 | Sesión, datos sensibles, TLS | 🟡 + API (errores sin detalles) |
| 9 | Secretos | Estático |
| 10, 26, 37 | Dependencias, cadena de suministro, licencias | Estático (versión fija) + revisión manual |
| 11-12 | SAST / DAST | Estático / XSS + CSP + fuzz |
| 13 | API | API: 5 Edge Functions |
| 14, 25 | Configuración, cabeceras | Estático (CSP, referrer), CSP |
| 15 | Subida de archivos | API (imagen inválida/gigante) + SQL (bucket) |
| 16 | Lógica de negocio | SQL funcional, metas, deudas, Seguridad SQL |
| 17 | Nube / IAM | Seguridad SQL (RLS, funciones, anon) |
| 18, 29 | Remediación y regresión de seguridad | Todas las suites de seguridad dentro del ejecutor |
| 20-23 | CSRF, SSRF, límites de uso, DoS | API (cuotas) + IA (200 simultáneos) |
| 28 | Privacidad y ciclo de vida | Privacidad (páginas, eliminar cuenta) + Seguridad SQL de eliminación |
| 36 | Fuzzing | IA (1.500 entradas en 5 funciones) |
| 19, 24, 27, 30-31, 33, 35, 38-40 | Pentest, logs, infraestructura, terceros, modelo de amenazas, DNS, simulacros, móvil, cumplimiento, red team | ⛔/🟡 manuales (ver informe de seguridad) |

## Las 15 pruebas de IA
| # | Prueba | Suite |
|---|---|---|
| 1-4 | Inyección, fuga, permisos, validación de salida | IA (Deno) |
| 5-6, 12-13, 15 | Precisión, benchmark, regresión, sesgo, deriva | IA real (modelo): `tests/ai-eval` con tu clave |
| 7, 14 | RAG y envenenamiento | IA (no hay RAG ni datos editables) |
| 8 | Imágenes | IA (entradas inválidas) + 6 fotos en `tests/ai-eval/images` |
| 9-11 | Robustez, costos, latencia/carga | IA (Deno) |

## Pruebas agregadas en esta fase
Privacidad: páginas legales en es/en/fr, avisos en login/portada/perfil, eliminar cuenta (interfaz + base de datos + hogar compartido).

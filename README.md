# Job Assistant Jr

Extension de Google Chrome Manifest V3 para asistir la busqueda laboral de perfiles Developer Jr, Backend Jr, Python Jr, Flask Jr o Trainee.

La extension funciona como asistente local: analiza ofertas visibles, prioriza oportunidades, genera cartas de postulacion y acelera el flujo de postulacion sin evadir captchas ni enviar formularios sin revision.

## Que hace

- Lee el texto visible de una oferta o de una pagina de resultados.
- Detecta tarjetas/listados de ofertas visibles y las guarda en el dashboard.
- Intenta detectar titulo, empresa, ubicacion, modalidad, seniority, tecnologias, requisitos, sueldo y link.
- Detecta experiencia requerida y pagina de origen.
- Compara la oferta con el perfil configurado.
- Calcula un score de compatibilidad de 0 a 100.
- Ordena el dashboard por mejores opciones.
- Separa ofertas en tabs: nuevas, postuladas y menos chances.
- Incluye contador semanal de analizadas/postuladas y deteccion de Easy Apply.
- Permite ocultar ofertas que no queres volver a ver.
- Incluye pagina de estadisticas para ver tecnologias, portales, modalidad y requisitos frecuentes.
- Permite cambiar plantilla de carta antes de preparar una postulacion.
- Genera un mensaje corto personalizado.
- Genera un email de presentacion personalizado.
- Guarda ofertas en `chrome.storage.local`.
- Evita duplicados por URL.
- Registra fecha y hora de postulacion cuando detecta envio o cuando se marca manualmente.
- Si la postulacion redirige a otro sitio, guarda tambien la URL donde se completo/detecto.
- Permite marcar estado: nueva, interesante, descartada, postulada, entrevista o rechazada.
- Incluye dashboard con filtros, orden por score/mejores opciones y acciones.
- Permite preparar postulaciones: copia carta, abre la oferta, intenta iniciar el formulario e intenta autocompletar campos de texto visibles.
- En portales laborales con formularios de postulacion muestra un boton flotante para autocompletar datos, carta y CV guardado.
- Incluye interruptor para prender/apagar el autocompletado flotante desde la extension.
- Incluye pagina de opciones para editar el perfil.

## Como instalar en Chrome

1. Abrir Chrome.
2. Entrar a `chrome://extensions`.
3. Activar `Modo desarrollador`.
4. Hacer click en `Cargar descomprimida`.
5. Seleccionar la carpeta `job-assistant-extension`.
6. Fijar la extension en la barra si queres tenerla a mano.

## Como usar

1. Abrir una oferta laboral en LinkedIn, Computrabajo, Zonajobs, Indeed u otra web.
2. Abrir la extension.
3. Hacer click en `Analizar pagina`.
4. Revisar el dashboard con las mejores opciones.
5. Usar `Generar mensaje` o `Generar email`.
6. Cambiar el estado si corresponde.
7. Hacer click en `Guardar oferta`.
8. Abrir `Dashboard` para ver el historial.
9. Usar `Postular` para abrir la oferta, preparar campos de texto y marcarla como postulada.
10. Si el portal muestra un formulario, usar `Autocompletar postulacion` para cargar tus datos rapido.

## Configuracion

Desde la pagina de opciones se puede editar:

- Nombre.
- Ubicacion.
- Objetivo laboral.
- Skills.
- Experiencia.
- Ingles.
- Preferencias.
- Elementos a evitar.
- Texto base de presentacion.
- Score minimo para marcar automaticamente como interesante.

## Limitaciones

- El extractor es generico porque cada portal arma sus paginas de forma distinta.
- Si un dato no aparece visible o esta dentro de componentes bloqueados, puede figurar como `No detectado`.
- El score es heuristico: sirve para priorizar, no reemplaza la revision humana.
- Los mensajes generados deben revisarse antes de enviarse.
- Intenta cargar el CV guardado en formularios con input de archivo cuando el navegador y la pagina lo permiten; si no, resalta el campo para adjuntarlo manualmente.
- No marca en verde solo por abrir una oferta. Si detecta que tocaste un boton final de envio en la pagina preparada, actualiza la oferta como postulada; tambien se puede marcar manualmente.
- Todo queda guardado localmente en el navegador.
- Las extensiones cargadas como descomprimidas no se actualizan solas. El repo genera un ZIP en GitHub Actions en cada push. Para actualizacion automatica real hay que publicar en Chrome Web Store o instalarla con una politica empresarial con `update_url`.

## Mejoras futuras

- Exportar historial a CSV/JSON.
- Agregar notas por oferta.
- Mejorar heuristicas por portal.
- Detectar rangos salariales con mas formatos.
- Agregar etiquetas personalizadas.
- Sincronizar backup manual en JSON.
- Publicar version empaquetada para actualizaciones automaticas.

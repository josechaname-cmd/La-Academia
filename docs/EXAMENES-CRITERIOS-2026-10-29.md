# Configuración y experiencia del examen

**Fecha:** 29 de octubre de 2026.

## Configurar desde la capacitación

En **Capacitaciones → Gestionar → Crear/Configurar examen**, el creador completa:

- Apertura y duración por intento. El cierre sigue siendo opcional.
- **Máximo de intentos:** entero de 1 a 10. En un examen nuevo se exige elegirlo; no se guarda un valor vacío.
- **Nota mínima para aprobar:** entero de 1 a 20. La interfaz y la API rechazan valores vacíos o fuera del rango.
- Preguntas, tres alternativas y respuesta correcta.

Cambiar preguntas, intentos o nota mínima genera una versión nueva con su propio cupo. Guardar sin cambios no duplica versiones. Modificar únicamente horario o duración mantiene la versión. Los resultados y los intentos ya iniciados conservan los criterios de su versión.

## Qué ve el trabajador

El curso muestra **Activo**, **Próximamente**, **Inactivo** o **Finalizado**. Si está activo y tiene cierre, muestra hasta qué fecha/hora estará disponible, en horario de Perú. La apertura ya no aparece en el detalle público.

Antes de comenzar se muestran preguntas, tiempo, máximo de intentos y nota mínima. La consulta del DNI verifica el cupo real. Durante el examen, la navegación numerada y el progreso quedan a un lado en escritorio; se apilan en pantallas pequeñas. Las opciones mantienen su posición al pasar el puntero. Al finalizar se muestran nota, aciertos, aprobación y siguiente acción; las explicaciones están agrupadas en un apartado desplegable.

## Reintentos

| Resultado de un intento | ¿Puede intentar de nuevo? |
|---|---|
| Menos del 90 % y cupo disponible | Sí, si la versión sigue activa |
| 90 % exacto o más, incluido 100 % | No |
| Límite de envíos alcanzado | No |
| Periodo cerrado, versión sustituida o examen desactivado | No desde ese resultado |

La aprobación se determina por la nota mínima configurada. Es independiente del permiso para reintentar: con mínimo 14, un 16 aprueba y puede mejorar si tiene cupo; con mínimo 20, un 18 no aprueba, pero el 90 % impide reintentar. El editor avisa de esta combinación.

El servidor compara los aciertos exactos, no el porcentaje redondeado para mostrar. Los bloqueos se verifican al identificar, iniciar y enviar, con el orden transaccional ya usado por la aplicación. Ocultar el botón no es la única protección: recargar o enviar una petición directa tampoco evita la regla. Un reenvío del mismo token conserva el resultado y no duplica notas.

Como en el flujo anterior, el cupo cuenta **envíos completados**. Un inicio nuevo reemplaza un intento pendiente. Las notas no se acumulan y el reporte mantiene el último envío por persona y versión.

## Integración e históricos

`exams.max_attempts` guarda el límite por versión. `exams.passing_score` guarda el mínimo; es nullable para versiones anteriores. Las tres versiones existentes en la instalación local conservaron su contenido e historial, con dos intentos y sin mínimo inventado. Al editarlas, el creador debe indicar el mínimo de la nueva versión.

La nueva [migración](../backend/src/Migrations/ExamPolicyMigration.php) es aditiva y repetible. Está incluida en `backend/scripts/migrate.php` para instalaciones/hosting. Se aplicó localmente y se verificó que no cambiaron las columnas preexistentes. El respaldo de código y de las filas originales de `exams` está en `storage/backups/exam-policy-20261029-075816`; el JSON de respaldo es privado y no debe publicarse.

Reportes y Excel incluyen nota mínima, intentos permitidos y aprobado/no aprobado. Sin mínimo histórico se muestra «Sin mínimo definido»; un resultado pendiente no se trata como desaprobado. La exportación conserva todos los participantes del examen seleccionado y sus filtros abarcan las nuevas columnas.

## Validación

- [exam-policy.php](../tests/exam-policy.php): criterios requeridos y rangos, límite de uno/tres intentos, aprobación exacta, 90/100 %, caso cercano al umbral, solicitudes directas, reenvío idempotente, versiones e históricos sin respuestas.
- [concurrency.php](../tests/concurrency.php): inicios/envíos simultáneos y rechazo de inicios concurrentes después de un perfecto.
- [http-contract.py](../tests/http-contract.py): configuración por capacitador, validación de API, permisos por sede, CSRF, bloqueo de reintento y nueva identificación tras un perfecto.
- [admin-exam.mjs](../tests/admin-exam.mjs) y [evaluation-dialog.mjs](../tests/evaluation-dialog.mjs): configuración, errores, disponibilidad pública, máximo dinámico, aprobación, ocultación de reintentos y recuperación de envío.
- [report_xlsx.py](../tests/report_xlsx.py): lectura independiente de Excel, columnas nuevas y filtro completo.

Ejecutar las pruebas PHP con `php tests/isolated.php …`; utilizan bases temporales y datos sintéticos. El comando `tools/check-local.ps1` incluye la nueva suite. Se mantienen las pruebas de gráficos, colaboradores, materiales, navegación y diseño.

La inspección visual en un navegador real sigue pendiente: el uso del navegador local está deshabilitado en el entorno. Las verificaciones de interfaz realizadas son de DOM, eventos, estilos compilados y accesibilidad programática.

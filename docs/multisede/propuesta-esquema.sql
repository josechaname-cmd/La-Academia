-- BORRADOR PARA REVISIÓN. NO EJECUTADO. MySQL 8.0, esquema descrito en el plan.
-- Aplicación manual futura solo con autorización, respaldo restaurable y prueba aislada.
-- No idempotente: comprobar nombres/columnas existentes antes de cualquier ejecución.
-- No cambia la PK DNI ni sus relaciones existentes. DDL tiene commit implícito.

ALTER TABLE employees
  ADD employee_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ADD UNIQUE KEY uq_employee_id (employee_id),
  ADD row_version BIGINT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE site_domains (
  hostname VARCHAR(253) CHARACTER SET ascii COLLATE ascii_general_ci PRIMARY KEY,
  site_id BIGINT UNSIGNED NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_site_permissions (
  admin_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  personnel_edit TINYINT(1) NOT NULL DEFAULT 0,
  personnel_import TINYINT(1) NOT NULL DEFAULT 0,
  granted_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id,site_id),
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT,
  FOREIGN KEY (granted_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employee_site_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NULL,
  assignment_type ENUM('initial','permanent','temporary','return','reentry') NOT NULL,
  reason VARCHAR(500) NOT NULL DEFAULT '',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (valid_to IS NULL OR valid_to>valid_from),
  INDEX idx_assignment_employee_period (employee_id,valid_from,valid_to),
  INDEX idx_assignment_site_period (site_id,valid_from,valid_to),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- La exclusión de periodos solapados exige bloqueo por persona + validación transaccional.
-- No generar fechas de ingreso históricas; sembrar solo asignaciones actuales verificadas.

CREATE TABLE personnel_changes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(40) NOT NULL,
  from_site_id BIGINT UNSIGNED NULL,
  to_site_id BIGINT UNSIGNED NULL,
  effective_at DATETIME NOT NULL,
  reason VARCHAR(500) NOT NULL DEFAULT '',
  changed_fields JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_personnel_change_history (employee_id,effective_at,id),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES admins(id) ON DELETE SET NULL,
  FOREIGN KEY (from_site_id) REFERENCES sites(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_site_id) REFERENCES sites(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- changed_fields: nombres de campos y evidencia mínima autorizada; no CSV, contraseñas o tokens.

ALTER TABLE enrollments
  ADD employee_id BIGINT UNSIGNED NULL,
  ADD site_id_at_start BIGINT UNSIGNED NULL,
  ADD CONSTRAINT fk_enrollment_employee_id FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_enrollment_start_site FOREIGN KEY (site_id_at_start) REFERENCES sites(id) ON DELETE RESTRICT;
-- NULL histórico significa desconocido. No inferir la sede de la persona desde la sede del curso.

ALTER TABLE events
  ADD site_id BIGINT UNSIGNED NULL,
  ADD created_by BIGINT UNSIGNED NULL,
  ADD INDEX idx_event_site_state (site_id,active,starts_at),
  ADD CONSTRAINT fk_event_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_event_creator FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;
-- Los eventos previos requieren clasificación; ningún capacitador puede apropiarse de NULL.

CREATE TABLE content_view_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  portal_site_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NOT NULL,
  session_key BINARY(32) NOT NULL,
  occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_view_site_course_session (portal_site_id,course_id,session_key),
  INDEX idx_view_site_period (portal_site_id,occurred_at,course_id),
  FOREIGN KEY (portal_site_id) REFERENCES sites(id) ON DELETE RESTRICT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- session_key: identificador aleatorio de sesión seudonimizado; nunca DNI, IP o fingerprint.
-- No backfill de contadores globales: no contienen atribución fiable del visitante.

-- REVERSIÓN FÍSICA SOLO EN ENSAYO VACÍO, ANTES DEL PILOTO; nunca con datos nuevos:
-- DROP TABLE content_view_events;
-- ALTER TABLE events DROP FOREIGN KEY fk_event_site, DROP FOREIGN KEY fk_event_creator,
--   DROP INDEX idx_event_site_state, DROP COLUMN site_id, DROP COLUMN created_by;
-- ALTER TABLE enrollments DROP FOREIGN KEY fk_enrollment_employee_id,
--   DROP FOREIGN KEY fk_enrollment_start_site, DROP COLUMN employee_id, DROP COLUMN site_id_at_start;
-- DROP TABLE personnel_changes;
-- DROP TABLE employee_site_assignments;
-- DROP TABLE admin_site_permissions;
-- DROP TABLE site_domains;
-- ALTER TABLE employees DROP COLUMN employee_id, DROP COLUMN row_version;
-- Después del piloto: revertir funciones conservando esquema/datos y revisar recuperación por separado.

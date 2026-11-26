package com.corsinotones.dto;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * The text is a real calendar date written {@code YYYY-MM-DD}: {@code 2026-02-30} and {@code 2026-2-3} fail.
 * A missing value fails too, so one message covers both cases (PRS-09).
 */
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DataIso.Validador.class)
public @interface DataIso {

	String message();

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	// LocalDate.parse uses ISO_LOCAL_DATE: two-digit month and day, the whole text, and a strict resolver.
	class Validador implements ConstraintValidator<DataIso, String> {

		@Override
		public boolean isValid(String valor, ConstraintValidatorContext contexto) {
			if (valor == null) {
				return false;
			}
			try {
				LocalDate.parse(valor);
				return true;
			} catch (DateTimeParseException erro) {
				return false;
			}
		}
	}
}

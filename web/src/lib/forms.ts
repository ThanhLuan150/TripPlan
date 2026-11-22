import type {FormikProps} from 'formik';
import type {AnyObject, ObjectSchema, ValidationError} from 'yup';

// Message of a field, once the user has left it after changing it, or when the
// form was submitted (a submit marks every field as touched and counts up).
// Just passing through an empty field (the first one is focused when a dialog
// opens) shows nothing. Without values/submitCount (a plain object) a touched
// field shows its error.
export const fieldError = <V extends object>(
  formik: Pick<FormikProps<V>, 'errors' | 'touched'> & Partial<Pick<FormikProps<V>, 'values' | 'initialValues' | 'submitCount'>>,
  name: keyof V & string,
): string | undefined => {
  const message = formik.errors[name];
  if (!formik.touched[name] || typeof message !== 'string') {
    return undefined;
  }
  const submitted = (formik.submitCount ?? 0) > 0;
  const changed = !formik.values || !formik.initialValues || formik.values[name] !== formik.initialValues[name];
  return submitted || changed ? message : undefined;
};

// The same, translated (the schemas hold i18n keys).
export const fieldMessage = <V extends object>(
  formik: Parameters<typeof fieldError<V>>[0],
  name: keyof V & string,
  t: (key: string) => string,
): string | undefined => {
  const message = fieldError(formik, name);
  return message ? t(message) : undefined;
};

// Run a schema without Formik: `{field: message}` of the invalid fields
// (empty when the values are valid). Messages are i18n keys.
export function schemaErrors<V extends AnyObject>(
  schema: ObjectSchema<AnyObject>,
  values: V,
): Partial<Record<keyof V & string, string>> {
  try {
    schema.validateSync(values, {abortEarly: false});
    return {};
  } catch (error) {
    const result: Record<string, string> = {};
    for (const issue of (error as ValidationError).inner) {
      if (issue.path && !(issue.path in result)) {
        result[issue.path] = issue.message;
      }
    }
    return result as Partial<Record<keyof V & string, string>>;
  }
}

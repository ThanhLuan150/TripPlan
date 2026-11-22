import * as Yup from 'yup';
import {describe, expect, it} from 'vitest';
import {fieldError, schemaErrors} from '@/lib/forms';

const schema = Yup.object({
  name: Yup.string().trim().required('name.required').max(5, 'name.long'),
  age: Yup.number().typeError('age.invalid').min(18, 'age.young').required('age.invalid'),
});

describe('schemaErrors', () => {
  it('is empty for valid values', () => {
    expect(schemaErrors(schema, {name: 'An', age: 20})).toEqual({});
  });

  it('gives the message of every invalid field', () => {
    expect(schemaErrors(schema, {name: ' ', age: 'abc'})).toEqual({name: 'name.required', age: 'age.invalid'});
  });

  it('keeps the first message of a field with several errors', () => {
    expect(schemaErrors(schema, {name: 'Nguyen Van', age: 1})).toEqual({name: 'name.long', age: 'age.young'});
  });
});

describe('fieldError', () => {
  it('hides the error until the field is touched', () => {
    expect(fieldError({errors: {name: 'name.required'}, touched: {}}, 'name')).toBeUndefined();
  });

  it('shows the error of a touched field', () => {
    expect(fieldError({errors: {name: 'name.required'}, touched: {name: true}}, 'name')).toBe('name.required');
  });

  it('is empty for a valid field', () => {
    expect(fieldError({errors: {}, touched: {name: true}}, 'name')).toBeUndefined();
  });

  it('stays quiet for a field that was only passed through, unchanged', () => {
    const formik = {errors: {name: 'name.required'}, touched: {name: true}, values: {name: ''}, initialValues: {name: ''}, submitCount: 0};

    expect(fieldError(formik, 'name')).toBeUndefined();
  });

  it('shows the error of a field that was changed and left', () => {
    const formik = {errors: {name: 'name.long'}, touched: {name: true}, values: {name: 'xxxxxx'}, initialValues: {name: ''}, submitCount: 0};

    expect(fieldError(formik, 'name')).toBe('name.long');
  });

  it('shows every error once the form was submitted', () => {
    const formik = {errors: {name: 'name.required'}, touched: {name: true}, values: {name: ''}, initialValues: {name: ''}, submitCount: 1};

    expect(fieldError(formik, 'name')).toBe('name.required');
  });

  it('ignores errors that are not a message (a list field)', () => {
    expect(fieldError({errors: {name: ['x']} as never, touched: {name: true}}, 'name')).toBeUndefined();
  });
});

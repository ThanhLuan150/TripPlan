import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import Field from '@/components/ui/Field';
import FieldError from '@/components/ui/FieldError';

describe('FieldError', () => {
  it('shows the message with a red alert icon', () => {
    const {container} = render(<FieldError>Required</FieldError>);

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.firstChild).toHaveClass('text-rose-600');
  });

  it.each([undefined, false, ''] as const)('shows nothing for %j', message => {
    const {container} = render(<FieldError>{message}</FieldError>);

    expect(container).toBeEmptyDOMElement();
  });

  it('can be an alert with an id', () => {
    render(<FieldError role="alert" id="x-error">Required</FieldError>);

    expect(screen.getByRole('alert')).toHaveAttribute('id', 'x-error');
  });
});

describe('Field', () => {
  it('marks its block as invalid (the red border) and shows the same error line', () => {
    const {container} = render(
      <Field label="Name" htmlFor="n" error="Required">
        <input id="n" className="field" />
      </Field>,
    );

    expect(container.firstChild).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByText('Required').closest('p')).toHaveClass('text-rose-600');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('is valid without an error', () => {
    const {container} = render(
      <Field label="Name" htmlFor="n">
        <input id="n" className="field" />
      </Field>,
    );

    expect(container.firstChild).toHaveAttribute('data-invalid', 'false');
    expect(container.querySelector('svg')).toBeNull();
  });
});

import {describe, expect, it, jest} from '@jest/globals';
import React from 'react';
import {Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import FieldError from '../src/components/FieldError';
import FormInput from '../src/components/FormInput';
import {colors} from '../src/lib/theme';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
};

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(node => node.props.children);

describe('FieldError', () => {
  it('shows the message', () => {
    expect(texts(render(<FieldError message="Required" />))).toContain(
      'Required',
    );
  });

  it.each([undefined, false, ''] as const)('shows nothing for %j', message => {
    expect(render(<FieldError message={message} />).toJSON()).toBeNull();
  });
});

describe('FormInput', () => {
  it('shows the same error line, and a red border, when invalid', () => {
    const tree = render(<FormInput label="NAME" error="Required" />);

    expect(texts(tree)).toContain('Required');
    expect(JSON.stringify(tree.toJSON())).toContain(colors.error);
  });

  it('has no error line when valid', () => {
    const tree = render(<FormInput label="NAME" />);

    expect(texts(tree)).not.toContain('Required');
    expect(JSON.stringify(tree.toJSON())).not.toContain('"alert"');
  });
});

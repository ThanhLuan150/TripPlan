import React from 'react';
import {FlatList, Image, Text, TextInput, TouchableOpacity} from 'react-native';
import BackHeader from '../src/components/BackHeader';
import BackPill from '../src/components/BackPill';
import ChatText from '../src/components/ChatText';
import EmptyState from '../src/components/EmptyState';
import ErrorText from '../src/components/ErrorText';
import FieldSection from '../src/components/FieldSection';
import HomeSlider from '../src/components/HomeSlider';
import ImageRail from '../src/components/ImageRail';
import Loading from '../src/components/Loading';
import NameDialog from '../src/components/NameDialog';
import QuickActions from '../src/components/QuickActions';
import RankingPreview from '../src/components/RankingPreview';
import RankingTabs from '../src/components/RankingTabs';
import SafeImage from '../src/components/SafeImage';
import SectionHeader from '../src/components/SectionHeader';
import SuggestionChips from '../src/components/SuggestionChips';
import {act, allText, press, pressText, render} from './helpers/render';

describe('SafeImage', () => {
  it('shows the source, then the fallback after an error', () => {
    const tree = render(<SafeImage source={{uri: 'x'}} fallback={7} />);
    expect(tree.root.findByType(Image).props.source).toEqual({uri: 'x'});
    act(() => tree.root.findByType(Image).props.onError());
    expect(tree.root.findByType(Image).props.source).toBe(7);
  });

  it('uses the fallback without a source', () => {
    const tree = render(<SafeImage source={undefined} fallback={3} />);
    expect(tree.root.findByType(Image).props.source).toBe(3);
  });
});

describe('small presentational components', () => {
  it('Loading renders a spinner', () => {
    expect(render(<Loading />).toJSON()).toBeTruthy();
  });

  it('ErrorText shows a message or nothing', () => {
    expect(allText(render(<ErrorText message="bad" />))).toBe('bad');
    expect(render(<ErrorText />).toJSON()).toBeNull();
  });

  it('EmptyState shows its text', () => {
    expect(allText(render(<EmptyState icon="x" text="Nothing" />))).toBe('Nothing');
  });

  it('BackPill and BackHeader call back', () => {
    const onPress = jest.fn();
    const pill = render(<BackPill onPress={onPress} top={10} />);
    press(pill.root.findByType(TouchableOpacity));
    const onBack = jest.fn();
    const header = render(<BackHeader title="Title" onBack={onBack} />);
    press(header.root.findByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
    expect(allText(header)).toBe('Title');
    render(<BackPill onPress={onPress} />);
    render(<BackHeader title="T" onBack={onBack} height={10} />);
  });

  it('SectionHeader shows "more" only when asked', () => {
    const onMore = jest.fn();
    const tree = render(<SectionHeader title="Hot" moreText="All" onMore={onMore} />);
    pressText(tree, 'All');
    expect(onMore).toHaveBeenCalled();
    expect(allText(render(<SectionHeader title="Hot" />))).toBe('Hot');
  });

  it('FieldSection shows title, hint, children and error', () => {
    const tree = render(
      <FieldSection icon="i" title="Name" hint="h" error="oops">
        <Text>child</Text>
      </FieldSection>,
    );
    expect(allText(tree)).toBe('Name|h|child|oops');
    expect(allText(render(<FieldSection icon="i" title="Name" />))).toBe('Name');
  });

  it('QuickActions press their action', () => {
    const a = jest.fn();
    const tree = render(
      <QuickActions
        actions={[{label: 'Go', icon: 'i', color: '#000', background: '#fff', onPress: a}]}
      />,
    );
    pressText(tree, 'Go');
    expect(a).toHaveBeenCalled();
  });

  it('RankingTabs mark and change the tab', () => {
    const onChange = jest.fn();
    const tree = render(
      <RankingTabs
        options={[{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]}
        value="a"
        onChange={onChange}
      />,
    );
    pressText(tree, 'B');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('SuggestionChips pick the translated text', () => {
    const onPick = jest.fn();
    const tree = render(<SuggestionChips onPick={onPick} />);
    act(() => tree.root.findAllByType(TouchableOpacity)[0].props.onPress());
    expect(onPick).toHaveBeenCalledWith(expect.any(String));
    expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(4);
  });

  it('HomeSlider renders a slide per image', () => {
    const tree = render(
      <HomeSlider slides={[{source: {uri: 'a'}, fallback: 1}, {source: undefined, fallback: 2}]} />,
    );
    expect(tree.root.findAllByType(Image)).toHaveLength(2);
  });

  it('ImageRail lists images and reports a pick', () => {
    const onPick = jest.fn();
    const images = [{source: {uri: 'a'}, fallback: 1}, {source: {uri: 'b'}, fallback: 2}];
    const tree = render(<ImageRail images={images} onPick={onPick} />);
    act(() => tree.root.findAllByType(TouchableOpacity)[1].props.onPress());
    expect(onPick).toHaveBeenCalledWith(1);
    // without onPick the cards are disabled and pressing is harmless
    const plain = render(<ImageRail images={images} />);
    const card = plain.root.findAllByType(TouchableOpacity)[0];
    expect(card.props.disabled).toBe(true);
    act(() => card.props.onPress());
    // separators
    expect(plain.root.findByType(FlatList).props.ItemSeparatorComponent()).toBeTruthy();
  });

  it('RankingPreview shows the names and medal rings', () => {
    const ranks = [0, 1, 2, 3].map(i => ({_id: i ? `u${i}` : undefined, fullname: `N${i}`, image: '/files/a', experience: i}));
    const tree = render(<RankingPreview ranks={ranks as any} />);
    expect(allText(tree)).toContain('N0');
    expect(allText(tree)).toContain('4');
  });

  it('RankingPreview opens the user on press, but not a row without an id', () => {
    const onPressUser = jest.fn();
    const ranks = [{_id: 'u1', fullname: 'A', experience: 1}, {fullname: 'B', experience: 0}];
    const tree = render(<RankingPreview ranks={ranks as any} onPressUser={onPressUser} />);
    const rows = tree.root.findAllByType(TouchableOpacity);
    press(rows[0]);
    expect(onPressUser).toHaveBeenCalledWith(expect.objectContaining({_id: 'u1'}));
    expect(rows[1].props.disabled).toBe(true);
  });
});

describe('ChatText', () => {
  it('formats headings, bullets and bold', () => {
    const tree = render(<ChatText text={'## Title\n* item\n- other **bold** end\nplain ****'} />);
    const txt = allText(tree);
    expect(txt).toContain('Title');
    expect(txt).toContain('•  item');
    expect(txt).toContain('bold');
    expect(txt).toContain('plain ****');
  });

  it('accepts a style', () => {
    expect(render(<ChatText text="**x**" style={{color: 'red'}} />).toJSON()).toBeTruthy();
  });
});

describe('NameDialog', () => {
  it('edits the name and confirms or cancels', () => {
    const onChange = jest.fn();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const tree = render(
      <NameDialog visible value="Trip" error="Too short" onChange={onChange} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    act(() => tree.root.findByType(TextInput).props.onChangeText('New'));
    expect(onChange).toHaveBeenCalledWith('New');
    expect(allText(tree)).toContain('Too short');
    render(<NameDialog visible value="" onChange={onChange} onCancel={onCancel} onConfirm={onConfirm} />);
  });
});

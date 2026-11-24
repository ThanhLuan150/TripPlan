import React from 'react';
import {FlatList, Linking, Modal, Text, TextInput, TouchableOpacity} from 'react-native';
import AreaTypeGrid from '../src/components/AreaTypeGrid';
import Button from '../src/components/Button';
import ChatBubble from '../src/components/ChatBubble';
import ChatComposer from '../src/components/ChatComposer';
import ChatToolbar from '../src/components/ChatToolbar';
import ConfirmModal from '../src/components/ConfirmModal';
import DayCard from '../src/components/DayCard';
import {GenerateError, PleaseWait} from '../src/components/GenerateStatus';
import OtpInput from '../src/components/OtpInput';
import PlanCard from '../src/components/PlanCard';
import QuantityInput from '../src/components/QuantityInput';
import TripHero from '../src/components/TripHero';
import TripItem from '../src/components/TripItem';
import TypingDots from '../src/components/TypingDots';
import VideoRail from '../src/components/VideoRail';
import {areaTypes} from '../src/lib/areaTypes';
import {act, allText, press, pressText, render} from './helpers/render';

const touchables = (tree: ReturnType<typeof render>) => tree.root.findAllByType(TouchableOpacity);

describe('TripItem', () => {
  const trip = {_id: '1', nameTrip: 'Hue', location: 'Huế', startDate: '2026-03-05', endDate: '2026-03-07', status: 'x'};
  it('shows the trip and opens / deletes it', () => {
    const onOpen = jest.fn();
    const onDelete = jest.fn();
    const tree = render(<TripItem trip={trip} onOpen={onOpen} onDelete={onDelete} />);
    expect(allText(tree)).toContain('Hue');
    expect(allText(tree)).toMatch(/5\/3/);
    press(touchables(tree)[0]);
    press(touchables(tree)[1]);
    expect(onOpen).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});

describe('VideoRail', () => {
  it('opens the YouTube link of a video', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const tree = render(<VideoRail />);
    press(touchables(tree)[0]);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('youtube.com'));
    expect(tree.root.findByType(FlatList).props.ItemSeparatorComponent()).toBeTruthy();
    open.mockRestore();
  });
});

describe('AreaTypeGrid', () => {
  it('marks the selected types and toggles', () => {
    const onToggle = jest.fn();
    const tree = render(<AreaTypeGrid selected={[areaTypes[0].value]} invalid onToggle={onToggle} />);
    expect(touchables(tree)).toHaveLength(areaTypes.length);
    press(touchables(tree)[1]);
    expect(onToggle).toHaveBeenCalledWith(areaTypes[1].value);
    render(<AreaTypeGrid selected={[]} onToggle={onToggle} />);
  });
});

describe('ChatToolbar', () => {
  it('shows the title and triggers history / new', () => {
    const onHistory = jest.fn();
    const onNew = jest.fn();
    const tree = render(<ChatToolbar title="My chat" canStartNew onHistory={onHistory} onNew={onNew} />);
    expect(allText(tree)).toContain('My chat');
    press(touchables(tree)[0]);
    press(touchables(tree)[1]);
    expect(onHistory).toHaveBeenCalled();
    expect(onNew).toHaveBeenCalled();
    const idle = render(<ChatToolbar canStartNew={false} onHistory={onHistory} onNew={onNew} />);
    expect(touchables(idle)[1].props.disabled).toBe(true);
  });
});

describe('Button', () => {
  it('presses, and shows a spinner while loading', () => {
    const onPress = jest.fn();
    const tree = render(<Button title="Go" onPress={onPress} />);
    pressText(tree, 'Go');
    expect(onPress).toHaveBeenCalled();
    const outline = render(<Button title="Go" onPress={onPress} variant="outline" />);
    expect(allText(outline)).toBe('Go');
    const loading = render(<Button title="Go" onPress={onPress} loading />);
    expect(allText(loading)).toBe('');
    expect(touchables(loading)[0].props.disabled).toBe(true);
    render(<Button title="Go" onPress={onPress} loading variant="outline" />);
  });
});

describe('TypingDots', () => {
  it('animates and cleans up', () => {
    jest.useFakeTimers();
    const tree = render(<TypingDots />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => tree.unmount());
    jest.useRealTimers();
  });
});

describe('PlanCard', () => {
  it('lists the days and activities and chooses', () => {
    const onChoose = jest.fn();
    const plan = {
      day1: {title: 'Beach', activities: [{challenge_summary: 'Swim'}]},
      day2: {title: 'Rest'},
    };
    const tree = render(<PlanCard plan={plan} number={2} location="Nha Trang" onChoose={onChoose} />);
    const txt = allText(tree);
    expect(txt).toContain('Nha Trang');
    expect(txt).toContain('Beach');
    expect(txt).toContain('- Swim');
    expect(txt).toContain('Rest');
    press(touchables(tree)[0]);
    expect(onChoose).toHaveBeenCalled();
  });
});

describe('TripHero', () => {
  it('shows place and dates, and opens the map', () => {
    const onMap = jest.fn();
    const tree = render(<TripHero location="Huế" startDate="2026-03-05" endDate="2026-03-07" onMap={onMap} />);
    expect(allText(tree)).toContain('Huế');
    expect(allText(tree)).toMatch(/5\/3\/2026/);
    press(touchables(tree)[0]);
    expect(onMap).toHaveBeenCalled();
    render(<TripHero onMap={onMap} />);
  });
});

describe('OtpInput', () => {
  it('types digits, moves forward and deletes backwards', () => {
    const onChange = jest.fn();
    const tree = render(<OtpInput value={['1', '', '', '', '', '']} onChange={onChange} />);
    const inputs = () => tree.root.findAllByType(TextInput);
    expect(inputs()).toHaveLength(6);
    act(() => inputs()[1].props.onChangeText('5'));
    expect(onChange).toHaveBeenLastCalledWith(['1', '5', '', '', '', '']);
    act(() => inputs()[5].props.onChangeText('9'));
    act(() => inputs()[2].props.onKeyPress({nativeEvent: {key: 'Backspace'}}));
    expect(onChange).toHaveBeenLastCalledWith(['1', '', '', '', '', '']);
    act(() => inputs()[0].props.onKeyPress({nativeEvent: {key: 'Backspace'}}));
    act(() => inputs()[0].props.onKeyPress({nativeEvent: {key: 'a'}}));
    act(() => inputs()[0].props.onKeyPress({nativeEvent: {key: 'Backspace'}}));
    act(() => inputs()[1].props.onFocus());
    act(() => inputs()[1].props.onBlur());
    render(<OtpInput value={[]} onChange={onChange} />);
  });
});

describe('DayCard', () => {
  const day = {title: 'Day 1', date: '2026-03-05', transportCost: 1000, foodCost: 2000, otherCost: 3000, challenges: []};
  it('hides its content until opened, and shows the costs', () => {
    const onToggle = jest.fn();
    const closed = render(<DayCard day={day} open={false} onToggle={onToggle}><Text>inside</Text></DayCard>);
    expect(allText(closed)).not.toContain('inside');
    press(touchables(closed)[0]);
    expect(onToggle).toHaveBeenCalled();
    const open = render(<DayCard day={day} open onToggle={onToggle}><Text>inside</Text></DayCard>);
    expect(allText(open)).toContain('inside');
    expect(allText(open)).toContain('1.000');
    expect(allText(open)).toContain('3.000');
    const noOther = render(
      <DayCard day={{...day, otherCost: 0, transportCost: undefined}} open onToggle={onToggle}><Text>x</Text></DayCard>,
    );
    expect(allText(noOther)).not.toContain('3.000');
  });
});

describe('QuantityInput', () => {
  it('steps within the limits and clamps typed values', () => {
    const onChange = jest.fn();
    const tree = render(<QuantityInput value={5} onChange={onChange} />);
    press(touchables(tree)[0]);
    expect(onChange).toHaveBeenLastCalledWith(4);
    press(touchables(tree)[1]);
    expect(onChange).toHaveBeenLastCalledWith(6);
    act(() => tree.root.findByType(TextInput).props.onChangeText('99'));
    expect(onChange).toHaveBeenLastCalledWith(10);
    act(() => tree.root.findByType(TextInput).props.onChangeText('abc'));
    expect(onChange).toHaveBeenLastCalledWith(1);
    const min = render(<QuantityInput value={1} onChange={onChange} invalid />);
    expect(touchables(min)[0].props.disabled).toBe(true);
    const max = render(<QuantityInput value={10} onChange={onChange} />);
    expect(touchables(max)[1].props.disabled).toBe(true);
  });
});

describe('ChatBubble', () => {
  it('shows my message', () => {
    expect(allText(render(<ChatBubble text="hi" mine />))).toBe('hi');
  });
  it('shows a bot message with resend and plan buttons', () => {
    const onResend = jest.fn();
    const onPlan = jest.fn();
    const tree = render(<ChatBubble text="answer" mine={false} onResend={onResend} onPlan={onPlan} />);
    press(touchables(tree)[0]);
    press(touchables(tree)[1]);
    expect(onResend).toHaveBeenCalled();
    expect(onPlan).toHaveBeenCalled();
    expect(touchables(render(<ChatBubble text="a" mine={false} />))).toHaveLength(0);
  });
});

describe('GenerateStatus', () => {
  it('PleaseWait shows the wait text', () => {
    expect(allText(render(<PleaseWait />))).toBeTruthy();
  });
  it('GenerateError retries, or explains an overlap', () => {
    const onRetry = jest.fn();
    const retry = render(<GenerateError overlap={false} onRetry={onRetry} />);
    press(touchables(retry)[0]);
    expect(onRetry).toHaveBeenCalled();
    const overlap = render(<GenerateError overlap onRetry={onRetry} />);
    expect(touchables(overlap)).toHaveLength(0);
  });
});

describe('ChatComposer', () => {
  it('types and sends; disabled when empty or sending', () => {
    const onChangeText = jest.fn();
    const onSend = jest.fn();
    const tree = render(<ChatComposer value="hi" sending={false} onChangeText={onChangeText} onSend={onSend} />);
    act(() => tree.root.findByType(TextInput).props.onChangeText('hey'));
    expect(onChangeText).toHaveBeenCalledWith('hey');
    press(touchables(tree)[0]);
    expect(onSend).toHaveBeenCalled();
    expect(touchables(render(<ChatComposer value="" sending={false} onChangeText={onChangeText} onSend={onSend} />))[0].props.disabled).toBe(true);
    expect(touchables(render(<ChatComposer value="x" sending onChangeText={onChangeText} onSend={onSend} />))[0].props.disabled).toBe(true);
  });
});

describe('ConfirmModal', () => {
  it('confirms, cancels and closes from the back button', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const tree = render(<ConfirmModal visible title="Delete?" onCancel={onCancel} onConfirm={onConfirm}><Text>sure</Text></ConfirmModal>);
    expect(allText(tree)).toContain('Delete?');
    press(touchables(tree)[1]);
    press(touchables(tree)[0]);
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(allText(render(<ConfirmModal visible title="t" confirmText="Yes" onCancel={onCancel} onConfirm={onConfirm} />))).toContain('Yes');
  });
});

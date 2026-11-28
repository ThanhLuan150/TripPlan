import {useEffect, useState} from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {tripsApi} from '../../api';
import {queryKeys} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {errorText} from '../../lib/apiClient';
import {colors, radius} from '../../lib/theme';

interface Props {
  // the post (public trip) being saved
  tripId: string;
  saved?: boolean;
}

// Save / Unsave of a post to read later. What is shown is the state the server answered, and
// the button is off while a request runs, so a double tap can never send two requests.
export default function SaveButton({tripId, saved = false}: Props) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const [state, setState] = useState(saved);
  // new data from the server (another page, a refetch)
  useEffect(() => setState(saved), [saved]);

  const toggle = useApiMutation(
    (save: boolean) =>
      save ? tripsApi.savePost(tripId) : tripsApi.unsavePost(tripId),
    {
      onSuccess: result => {
        setState(result.saved);
        // the Saved posts area must show the change at once
        qc.invalidateQueries({queryKey: queryKeys.savedPosts});
      },
      onError: e => alert.error(t('trips.savePostFailed'), errorText(e)),
    },
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t(state ? 'trips.unsavePost' : 'trips.savePost')}
      accessibilityState={{selected: state, disabled: toggle.isPending}}
      disabled={toggle.isPending}
      style={[
        styles.button,
        state && styles.saved,
        toggle.isPending && styles.disabled,
      ]}
      onPress={() => toggle.mutate(!state)}>
      <Ionicons
        name={state ? 'bookmark' : 'bookmark-outline'}
        size={18}
        color={state ? colors.primaryDark : colors.muted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: radius.pill,
  },
  saved: {backgroundColor: colors.tint},
  disabled: {opacity: 0.6},
});

import {useQuery} from '@tanstack/react-query';
import {homeApi} from './api';

// Slider and suggestions of the home page, as the admin set them.
export const useHomeContent = () => useQuery({queryKey: ['home-content'], queryFn: homeApi.get});

import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';

function scheduledFetchDecorator(fn: unknown) {

    let setIntervalRef: any, obs = new BehaviorSubject<null | any>(null);
    const cacher = new Map(),

    returnedFunction = async (url: string, wait: number, options?: RequestInit | undefined) => {

        const isKeyCached = cacher.has(url);

        if(!isKeyCached) {
            const stored = await Preferences.get({key:url});

            if(typeof stored !== 'string') await setData(url, wait, options);

            if(typeof stored === 'string') {
                const ref = JSON.parse(stored);
                cacher.set(url, ref);
                obs.next(ref);
            }
        }

        const data = cacher.get(url);

        if(data.nextScheduleRequest <= Date.now()) {
            await setData(url, wait, options);
        }

        intervalRequest(url, wait, options, data);
        return obs;
    },

    intervalRequest = (url: string, wait: number, options: RequestInit | undefined, data: any) => {
        const timer = data.nextScheduleRequest - Date.now();
        setIntervalRef = setTimeout(async () => {
            await setData(url, wait, options);
            clearTimeout(setIntervalRef);
            intervalRequest(url, wait, options, cacher.get(url));
        }, timer <= 0 ? 100 : timer);
    },

    setData = async (url: string, wait: number, options: RequestInit | undefined) => {
        const data = await (await (fn as typeof fetch)(url, options)).json(),
        timestamp = Date.now(),
        composeData = {
            data,
            lastRequest: timestamp,
            nextScheduleRequest: timestamp + wait
        }

        cacher.set(url, composeData);
        Preferences.set({ key: url, value: JSON.stringify(composeData)});
        obs.next(data);
    }

    return returnedFunction;

}

const scheduleFetch = scheduledFetchDecorator(fetch);

export {
    scheduleFetch
}
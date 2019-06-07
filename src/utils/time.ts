import { HOUR_MILLISECONDS, DAY_MILLISECONDS, FORECAST_DAYS_LIMIT } from '../constants'
import { NluSlot, slotType, Enums } from 'hermes-javascript/types'

export type TimeSlot = NluSlot<slotType.instantTime | slotType.timeInterval>
export type TimeInterval = { from: number, to: number, rawValue?: string }

function intersect (interval1: TimeInterval, interval2: TimeInterval) {
    return (
        interval1.from <= interval2.to &&
        interval1.to >= interval2.from
    )
}

export const time = {
    isToday(date: Date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const interval = {
            min: today.getTime(),
            max: today.getTime() + DAY_MILLISECONDS
        }

        return date.getTime() >= interval.min && date.getTime() <= interval.max
    },

    isTomorrow(date: Date) {
        const tomorrow = new Date(Date.now() + DAY_MILLISECONDS)
        tomorrow.setHours(0, 0, 0, 0)
        const interval = {
            min: tomorrow.getTime(),
            max: tomorrow.getTime() + DAY_MILLISECONDS
        }

        return date.getTime() >= interval.min && date.getTime() <= interval.max
    },

    extractTimeInterval: (timeSlots: TimeSlot[]) => {
        const [result, truncated]  = time.extractTimeIntervals(timeSlots)
        if (result && result.length > 0)
            return [result[0], truncated]
        return null
    },

    extractTimeIntervals: (timeSlots: TimeSlot[]): [TimeInterval[], boolean] => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // No time slots specified, use the current day
        if (timeSlots.length < 1) {
            return [[{
                from: today.getTime(),
                to: today.getTime() + DAY_MILLISECONDS
            }], false]
        }

        const limits = {
            min: today.getTime(),
            max: today.getTime() + FORECAST_DAYS_LIMIT + DAY_MILLISECONDS
        }

        let intervals: TimeInterval[] = []
        let truncated = false

        timeSlots.forEach(timeSlot => {
            const { value, rawValue } = timeSlot

            let intervalValue = {
                from: null,
                to: null
            }

            if (value.kind === slotType.instantTime) {
                // Instant time
                const { grain } = value

                const instantTime = new Date(value.value).getTime()

                // if(instantTime < today.getTime() || grain < 3)
                //     throw new Error('intersection')

                // Set the interval based on the grain and precision
                intervalValue.from = instantTime
                intervalValue.to =
                    grain === Enums.grain.week ?
                        instantTime + DAY_MILLISECONDS * 7 :
                    grain === Enums.grain.day ?
                        instantTime + DAY_MILLISECONDS :
                    grain === Enums.grain.hour ?
                        instantTime + HOUR_MILLISECONDS :
                    instantTime

            } else if (value.kind === slotType.timeInterval) {
                // Interval
                intervalValue.from = value.from && new Date(value.from).getTime() || Date.now()
                intervalValue.to = value.to && new Date(value.to).getTime() || Date.now()
            }

            // If the interval is out of the supported range
            if (intervalValue.from < limits.min || intervalValue.to > limits.max)
                // throw new Error('intersection')
                truncated = true

            if (!intervals.length) {
                intervals.push({ from: intervalValue.from, to: intervalValue.to, rawValue })
            } else {
                const intersected = intervals.some(interval => {
                    if (intersect(interval, intervalValue)) {
                        if (intervalValue.from < interval.from) {
                            interval.from = intervalValue.from
                        }
                        if (intervalValue.to > interval.to) {
                            interval.to = intervalValue.to
                        }
                        return true
                    }
                })
                if (!intersected) {
                    intervals.push({ from: intervalValue.from, to: intervalValue.to, rawValue })
                }
            }
        })

        // Sort in ascending order
        intervals.sort((i1, i2) => i1.from - i2.from)

        return [intervals, truncated]
    }
}

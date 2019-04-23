import { i18nFactory } from '../factories/i18nFactory'
import { ForecastDayReport } from './weather'
import { trimStart } from './string'

export const translation = {
    // Outputs an error message based on the error object, or a default message if not found.
    errorMessage: async (error: Error): Promise<string> => {
        let i18n = i18nFactory.get()

        if(!i18n) {
            await i18nFactory.init()
            i18n = i18nFactory.get()
        }

        if(i18n) {
            return i18n([`error.${error.message}`, 'error.unspecific'])
        } else {
            return 'Oops, something went wrong.'
        }
    },
    // Takes an array from the i18n and returns a random item.
    randomTranslation (key: string | string[], opts: {[key: string]: any}): string {
        const i18n = i18nFactory.get()
        const possibleValues = i18n(key, { returnObjects: true, ...opts })

        if (typeof possibleValues === 'string')
            return possibleValues

        const randomIndex = Math.floor(Math.random() * possibleValues.length)
        return possibleValues[randomIndex]
    },

    // Joins pieces of text with a conjunction (and)
    joinTerms(list: string[]) {
        if(!list || list.length < 2)
            return list && list[0] || ''

        const i18n = i18nFactory.get()
        let joinedString = ''
        for (let i = 0; i < list.length; i++) {
            const element = list[i]

            if(i === (list.length - 1)) {
                joinedString += ' ' + i18n('joins.andSomething', { something: element }) + ' '
                continue
            } else if(i > 0) {
                joinedString += ', '
            }

            joinedString += element
        }
        return joinedString
    },

    forecastToSpeech(formattedWeatherData: ForecastDayReport[], place?: string) {
        const i18n = i18nFactory.get()
        const { joinTerms, randomTranslation } = translation
        let lastDay: string = null
        let firstDay = true

        return formattedWeatherData.reduce((speech, day) => {
            let time = ''
            let predictions = ''
            let temperatures = ''

            const sameDay = lastDay === day.days[0]
            lastDay = day.days[day.days.length - 1]

            if (day.labels.size === 0 && !sameDay) {
                time = joinTerms(day.days.map(day => i18n('days.' + day)))
            } else {
                if (!sameDay && !day.customLabel)
                    time = i18n('days.' + day.days[0]) + ', '
                
                if (formattedWeatherData.length !== 1)
                    time += joinTerms(Array.from(day.labels).map(label => i18n(['partOfDay.' + label, label || ''])))
            }

            const weatherAdjective = ('quantifier' in day.report) ? 'quantifier' : 'qualifier'

            const weather =
                i18n([weatherAdjective + '.' + day.report[weatherAdjective], '']) +
                ' ' +
                i18n('weatherTypes.' + weatherAdjective + '.' + day.report.type)
            predictions += randomTranslation('forecast.weather.prediction.' + weatherAdjective, { weather })

            if (Math.abs(day.temperatures.min - day.temperatures.max) >= 4) {
                temperatures += randomTranslation('forecast.weather.temperatures.range', {
                    minTemp: day.temperatures.min,
                    maxTemp: day.temperatures.max
                })
            } else {
                temperatures += randomTranslation('forecast.weather.temperatures.exact', {
                    temperature: Math.floor((day.temperatures.min + day.temperatures.max) / 2)
                })
            }

            const daySentence = trimStart(i18n('forecast.weather.day', {
                time,
                predictions,
                temperatures,
                place: firstDay && place ? place : null,
                context: firstDay && place ? 'place' : null
            }))

            firstDay = false

            speech += daySentence.charAt(0).toUpperCase() + daySentence.slice(1) + '\n'
            return speech
        }, '')
    },

    temperatureToSpeech(formattedWeatherData: ForecastDayReport[], place?: string): string {
        const i18n = i18nFactory.get()
        const { joinTerms, randomTranslation } = translation
        let lastDay: string = null
        let firstDay = true

        return formattedWeatherData.reduce((speech, day) => {
            let time = ''
            let temperatures = ''

            const sameDay = lastDay === day.days[0]
            lastDay = day.days[day.days.length - 1]

            if (day.labels.size === 0 && !sameDay) {
                time = joinTerms(day.days.map(day => i18n('days.' + day)))
            } else {
                if (!sameDay && !day.customLabel)
                    time = i18n('days.' + day.days[0]) + ', '

                if (formattedWeatherData.length !== 1)
                    time += joinTerms(Array.from(day.labels).map(label => i18n(['partOfDay.' + label, label || ''])))
            }

            if (Math.abs(day.temperatures.min - day.temperatures.max) >= 4) {
                temperatures += randomTranslation('forecast.temperatures.temperatures.range', {
                    minTemp: day.temperatures.min,
                    maxTemp: day.temperatures.max
                })
            } else {
                temperatures += randomTranslation('forecast.temperatures.temperatures.exact', {
                    temperature: Math.floor((day.temperatures.min + day.temperatures.max) / 2)
                })
            }

            const daySentence = trimStart(i18n('forecast.temperatures.day', {
                time,
                temperatures,
                place: firstDay && place ? place : null,
                context: firstDay && place ? 'place' : null
            }))

            firstDay = false

            speech += daySentence.charAt(0).toUpperCase() + daySentence.slice(1) + '\n'
            return speech
        }, '')
    },

    conditionToSpeech (name: string, condition: string, place: string) {
        const randomTranslation = translation.randomTranslation
        return randomTranslation(`forecast.conditional.${condition}.${name}`, { place }) + '\n'
    },

    warnAboutTruncatedIntervals(isTruncated: boolean): string {
        const i18n = i18nFactory.get()
        return isTruncated ? i18n('warning.truncatedIntervals') : ''
    }
}

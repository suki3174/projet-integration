// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import { IntlShape } from 'react-intl'

import { BoardView } from './blocks/boardView'
import { Board, IPropertyTemplate } from './blocks/board'
import { Card } from './blocks/card'
import {createCard} from './blocks/card'; // ajoute tout en haut du fichier

import { Utils } from './utils'
import { IAppWindow } from './types'
import propsRegistry from './properties'
import mutator from './mutator'

declare let window: IAppWindow
const hashSignToken = '___hash_sign___'

class CsvExporter {

    // Export the current view as a CSV file
    static exportTableCsv(board: Board, activeView: BoardView, cards: Card[], intl: IntlShape, view?: BoardView): void {
        const viewToExport = view ?? activeView

        if (!viewToExport) {
            return
        }

        const rows = CsvExporter.generateTableArray(board, cards, viewToExport, intl)

        let csvContent = 'data:text/csv;charset=utf-8,'

        rows.forEach((row) => {
            const encodedRow = row.join(',')
            csvContent += encodedRow + '\r\n'
        })

        const encodedUri = encodeURI(csvContent).replace(hashSignToken, '%23')

        const filename = `${Utils.sanitizeFilename(viewToExport.title || 'Untitled')}.csv`
        const link = document.createElement('a')
        link.style.display = 'none'
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', filename)
        document.body.appendChild(link)						// FireFox support

        link.click()

        // TODO: Review if this is needed in the future, this is to fix the problem with linux webview links
        if (window.openInNewBrowser) {
            window.openInNewBrowser(encodedUri)
        }

        // TODO: Remove or reuse link
    }

    //Import a CSV file into the current board as cards


    static importTableCsv(board: Board, intl: IntlShape): void {
    try {
        const input: HTMLInputElement = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';

        input.onchange = async (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
                return;
            }

            const text: string = await file.text();
            const lines: string[] = text.split(/\r?\n/).filter((line: string) => line.trim() !== '');

            if (lines.length === 0) {
                console.warn('CSV file is empty');
                return;
            }

            const headers: string[] = lines[0]
                .split(',')
                .map((h: string) => h.replace(/"/g, '').trim());

            const data: Record<string, string>[] = lines.slice(1).map((line: string) => {
                const values: string[] = line.split(',').map((v: string) => v.replace(/"/g, '').trim());
                const entry: Record<string, string> = {};
                headers.forEach((header: string, index: number) => {
                    entry[header] = values[index] || '';
                });
                return entry;
            });

            await mutator.performAsUndoGroup(async () => {
                for (const row of data) {
                    const newCard = createCard();
                    newCard.boardId = board.id;
                    newCard.parentId = board.id;
                    newCard.title = row['Name'] || 'Untitled';

                    // Parcours des propriétés visibles du board
                    board.cardProperties.forEach((prop) => {
                        const csvValue = row[prop.name];  // Cherche la valeur dans le CSV
                        if (csvValue) {
                            newCard.fields.properties[prop.id] = csvValue;  // Assigne à la carte
                        }
                    });

                    await mutator.insertBlock(board.id, newCard);
                }
            });

            const importCompleteMessage = intl.formatMessage({
                id: 'ViewHeader.import-complete',
                defaultMessage: 'Import complete!',
            });
            alert(importCompleteMessage);
        };

        input.click();
    } catch (e) {
        Utils.logError(`ImportCSV ERROR: ${e}`);
        const importFailedMessage = intl.formatMessage({
            id: 'ViewHeader.import-failed',
            defaultMessage: 'Import failed!',
        });
        alert(importFailedMessage);
    }
}






    private static encodeText(text: string): string {
        return text.replace(/"/g, '""').replace(/#/g, hashSignToken)
    }

    private static generateTableArray(board: Board, cards: Card[], viewToExport: BoardView, intl: IntlShape): string[][] {
        const rows: string[][] = []
        const visibleProperties = board.cardProperties.filter((template: IPropertyTemplate) => viewToExport.fields.visiblePropertyIds.includes(template.id))

        if (viewToExport.fields.viewType === 'calendar' &&
            viewToExport.fields.dateDisplayPropertyId &&
            !viewToExport.fields.visiblePropertyIds.includes(viewToExport.fields.dateDisplayPropertyId)) {
            const dateDisplay = board.cardProperties.find((template: IPropertyTemplate) => viewToExport.fields.dateDisplayPropertyId === template.id)
            if (dateDisplay) {
                visibleProperties.push(dateDisplay)
            }
        }

        {
            // Header row
            const row: string[] = [intl.formatMessage({ id: 'TableComponent.name', defaultMessage: 'Name' })]
            visibleProperties.forEach((template: IPropertyTemplate) => {
                row.push(template.name)
            })
            rows.push(row)
        }

        cards.forEach((card) => {
            const row: string[] = []
            row.push(`"${this.encodeText(card.title)}"`)
            visibleProperties.forEach((template: IPropertyTemplate) => {
                let propertyValue = card.fields.properties[template.id]
                const property = propsRegistry.get(template.type)
                if (property.type === 'createdBy') {
                    propertyValue = card.createdBy
                }
                if (property.type === 'updatedBy') {
                    propertyValue = card.modifiedBy
                }
                row.push(property.exportValue(propertyValue, card, template, intl))
            })
            rows.push(row)
        })

        return rows
    }
}

export { CsvExporter }

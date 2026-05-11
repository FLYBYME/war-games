import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Button } from './Button';
import { Select } from './Select';
import { Row } from '../layout/Row';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export class Pagination extends BaseComponent<PaginationProps> {
    constructor(props: PaginationProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';
        const { currentPage, totalPages, onPageChange } = this.props;

        const prevBtn = new Button({
            icon: 'fas fa-chevron-left',
            variant: 'secondary',
            disabled: currentPage <= 1,
            onClick: () => onPageChange(currentPage - 1)
        });

        const nextBtn = new Button({
            icon: 'fas fa-chevron-right',
            variant: 'secondary',
            disabled: currentPage >= totalPages,
            onClick: () => onPageChange(currentPage + 1)
        });

        const pageOptions = Array.from({ length: totalPages }, (_, i) => ({
            label: `Page ${i + 1}`,
            value: (i + 1).toString()
        }));

        const jumpTo = new Select({
            options: pageOptions,
            value: currentPage.toString(),
            onChange: (val) => onPageChange(parseInt(val)),
            placeholder: `Page ${currentPage}`
        });

        // Wrap Select to control its width in the row
        const selectContainer = jumpTo.getElement();
        selectContainer.style.width = '100px';

        const row = new Row({
            gap: 'sm',
            align: 'center',
            children: [prevBtn, jumpTo, nextBtn]
        });

        this.appendChildren(row);
    }
}
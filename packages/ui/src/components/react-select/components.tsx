import { components } from 'react-select';
import { Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { Chip } from '../chip';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DropdownIndicator = (props: any) => {
    return (
        <components.DropdownIndicator {...props}>
            <ChevronDown className={'h-4 w-4 opacity-50'} />
        </components.DropdownIndicator>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ClearIndicator = (props: any) => {
    return (
        <components.ClearIndicator {...props}>
            <X className={'h-3.5 w-3.5 opacity-50'} />
        </components.ClearIndicator>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MultiValueRemove = (props: any) => {
    const { data } = props;
    return data.isFixed ? null : (
        <components.MultiValueRemove className='bg-destructive/10' {...props}>
            <X className={'h-3 w-3 opacity-50'} />
        </components.MultiValueRemove>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Option = (props: any) => {
    return (
        <components.Option {...props}>
            <div
                className={cn(
                    "flex items-center justify-between",
                    props.isSelected && "text-primary-foreground",
                )}
            >
                <div>{props.data.label}</div>
                {props.isSelected && <Check size={16} className="text-primary-foreground" />}
                {props.data?.role && <Chip className="p-0 px-1" variant='light' size='xs' color='indigo'>{props.data?.role}</Chip>}
            </div>
        </components.Option>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomOption = (props: any) => {
    const { formatOptionLabel } = props.selectProps;

    return (
        <components.Option {...props}>
            {formatOptionLabel
                ? formatOptionLabel(props.data, { context: 'menu' })
                : props.data.label}
        </components.Option>
    );
}
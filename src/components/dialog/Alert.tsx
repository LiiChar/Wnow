import { ParentProps } from "solid-js";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogAction, AlertDialogClose } from "../ui/AlertDialog";

type AlertProps = {
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel?: () => void;
} & ParentProps;

export const Alert = ({ title, description, onConfirm, onCancel, children }: AlertProps) => {
  return (
		<AlertDialog>
			<AlertDialogTrigger>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogClose  onClick={onCancel}>Нет</AlertDialogClose>
					<AlertDialogAction onClick={onConfirm}>Да</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
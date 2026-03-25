import { cn } from "@/shared/lib/utils";
import { A, useLocation } from "@solidjs/router";
import { BookOpen, GraduationCap, Settings } from "lucide-solid";


export const Footer = () => {
	const location = useLocation()


	const isActive = (path: string) => {
		return location.pathname === path;
	};

  return (
		<nav class=' bottom-2 flex justify-center fixed w-full'>
			<div class='flex justify-center p-2 gap-2 max-w-md mx-auto bg-muted/20 backdrop-blur-lg rounded-full border-border border'>
				<A
					class={cn(
						'flex justify-center items-center p-3 rounded-full ',
						isActive('/') ? 'scale-105 bg-primary' : '',
					)}
					href='/'
				>
					<BookOpen size={22} />
				</A>
				<A
					class={cn(
						'flex justify-center items-center p-3 rounded-full ',
						isActive('/study') ? 'scale-105 bg-primary' : '',
					)}
					href='/study'
				>
					<GraduationCap size={22} />
				</A>
				<A
					class={cn(
						'flex justify-center items-center p-3 rounded-full ',
						isActive('/settings') ? 'scale-105 bg-primary' : '',
					)}
					href='/settings'
				>
					<Settings size={22} />
				</A>
			</div>
		</nav>
	);

}
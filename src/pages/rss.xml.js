import rss from '@astrojs/rss';
import { supabase } from '../lib/supabase';

export async function GET(context) {
	const { data: posts } = await supabase
		.from('posts')
		.select('title, slug, description, created_at')
		.order('created_at', { ascending: false });

	const response = rss({
		title: 'duolb – Beauty Blog',
		description: 'Beauty, Hautpflege, Trends und ehrliche Produktempfehlungen.',
		site: context.site,
		items: posts.map(post => ({
			title: post.title,
			description: post.description || '',
			pubDate: new Date(post.created_at),
			link: `/posts/${post.slug}`,
		})),
	});

	response.headers.set(
		'Cache-Control',
		'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
	);

	return response;
}

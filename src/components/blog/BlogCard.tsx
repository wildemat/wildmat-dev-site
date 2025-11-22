import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface BlogPost {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
}

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={post.image}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Badge className="absolute right-4 top-4" variant="default">
          {post.category}
        </Badge>
      </div>

      <CardHeader>
        <h3 className="line-clamp-2 text-xl font-semibold leading-tight transition-colors group-hover:text-primary">
          {post.title}
        </h3>
      </CardHeader>

      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {post.description}
        </p>

        {/* Meta Information */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{post.readTime}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-start gap-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Read More Button */}
        <Button variant="ghost" className="group/btn w-full justify-between px-0">
          <span>Read More</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BlogCard;


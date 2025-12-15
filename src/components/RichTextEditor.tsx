import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Youtube from '@tiptap/extension-youtube';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bold, Italic, List, ListOrdered, Heading2, Youtube as YoutubeIcon, Video, Link as LinkIcon, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Youtube.configure({
        width: 640,
        height: 360,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const addYoutubeVideo = () => {
    if (youtubeUrl && editor) {
      editor.commands.setYoutubeVideo({
        src: youtubeUrl,
      });
      setYoutubeUrl("");
      setShowYoutubeInput(false);
    }
  };

  const addDriveEmbed = () => {
    if (driveUrl && editor) {
      // Extract file ID from Drive URL
      let fileId = '';
      if (driveUrl.includes('/file/d/')) {
        fileId = driveUrl.split('/file/d/')[1].split('/')[0];
      } else if (driveUrl.includes('id=')) {
        fileId = driveUrl.split('id=')[1].split('&')[0];
      }
      
      if (fileId) {
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        editor.commands.insertContent(
          `<iframe src="${embedUrl}" width="640" height="480" allow="autoplay"></iframe>`
        );
      }
      setDriveUrl("");
      setShowDriveInput(false);
    }
  };

  const addLink = () => {
    if (linkUrl && linkText && editor) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
        .run();
      setLinkUrl("");
      setLinkText("");
      setShowLinkInput(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await apiFetch<{ url?: string }>('/materials/upload-richtext', { method: 'POST', body }).catch(() => ({ url: '' }));
      const url = res.url || URL.createObjectURL(file);
      editor?.commands.insertContent(
        `<video controls width="640" height="360" src="${url}"></video>`
      );
      toast.success('Video uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex gap-1 p-2 border-b bg-muted/30 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading') ? 'bg-muted' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowYoutubeInput(!showYoutubeInput)}
        >
          <YoutubeIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            document.getElementById('video-upload')?.click();
          }}
          disabled={uploading}
        >
          <Video className="h-4 w-4" />
        </Button>
        <input
          id="video-upload"
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDriveInput(!showDriveInput)}
          title="Embed Google Drive"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLinkInput(!showLinkInput)}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {showYoutubeInput && (
        <div className="p-2 border-b flex gap-2">
          <Input
            placeholder="Paste YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          <Button size="sm" onClick={addYoutubeVideo}>Add</Button>
        </div>
      )}
      
      {showDriveInput && (
        <div className="p-2 border-b flex gap-2">
          <Input
            placeholder="Paste Google Drive URL"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
          />
          <Button size="sm" onClick={addDriveEmbed}>Add</Button>
        </div>
      )}
      
      {showLinkInput && (
        <div className="p-2 border-b flex flex-col gap-2">
          <Input
            placeholder="Link Text (what users will see)"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Paste URL (Google Drive link or any URL)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button size="sm" onClick={addLink}>Add Link</Button>
          </div>
        </div>
      )}
      
      <EditorContent
        editor={editor} 
        className="min-h-[200px] max-h-[400px] overflow-y-auto focus:outline-none [&_.ProseMirror]:p-4 [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_iframe]:max-w-full [&_.ProseMirror_iframe]:aspect-video [&_.ProseMirror_video]:max-w-full [&_.ProseMirror_video]:aspect-video"
      />
    </div>
  );
}
